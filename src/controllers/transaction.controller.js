import mongoose from "mongoose";
import { MAX_AMOUNT, MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import {
  getSearchFilterQuery,
  normalizeTransactionType,
  recomputeContactBalance,
} from "../helpers/functions.js";
import { getSignedUrlFor } from "../utils/s3.js";
import {
  mirrorTransactionCreate,
  mirrorTransactionDelete,
  mirrorTransactionUpdate,
} from "../services/ledger-link.service.js";
import Transaction from "../models/transaction.model.js";
import Contact from "../models/contact.model.js";

const withAttachmentUrl = async (transaction) => {
  const obj = transaction.toObject ? transaction.toObject() : transaction;
  return { ...obj, attachment_url: await getSignedUrlFor(obj.attachment_key) };
};

export const create = async (req, res) => {
  try {
    const { business_id } = req.user;
    const { contact, amount, description, payment_mode, transaction_date } =
      req.body;

    const transaction_type = normalizeTransactionType(
      req.body.transaction_type
    );
    if (!transaction_type) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.INVALID_TRANSACTION_TYPE,
      });
    }

    if (!(Number(amount) > 0)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.INVALID_AMOUNT,
      });
    }

    if (Number(amount) > MAX_AMOUNT) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.AMOUNT_TOO_LARGE,
      });
    }

    const contactDoc = await Contact.findOne({
      _id: contact?._id,
      business_id,
      status: { $ne: STATUS.DELETED },
    });

    if (!contactDoc) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CONTACT_NOT_FOUND,
      });
    }

    const transaction = await Transaction.create({
      business_id,
      contact: { _id: contactDoc._id, name: contactDoc.name },
      amount,
      transaction_type,
      payment_mode,
      description: description || "",
      ...(transaction_date ? { created_at: new Date(transaction_date) } : {}),
    });

    const contact_balance = await recomputeContactBalance(contactDoc._id, {
      transactionCountDelta: 1,
    });

    await mirrorTransactionCreate(transaction, contactDoc);
    const saved = (await Transaction.findById(transaction._id)) || transaction;

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { transaction: await withAttachmentUrl(saved), contact_balance },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const transactions = async (req, res) => {
  const { business_id } = req.user;
  const { page, limit } = req.query;

  const { query: filter, sort } = getSearchFilterQuery(req.query.filter);

  filter.$and.push({ business_id: { $eq: business_id } });

  try {
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

      const [transactions, total] = await Promise.all([
        Transaction.find(filter)
          .sort(sort)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        Transaction.countDocuments(filter),
      ]);

      return res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        data: {
          transactions,
          total,
          has_more: (pageNum - 1) * limitNum + transactions.length < total,
        },
      });
    }

    const transactions = await Transaction.find(filter).sort(sort);

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        transactions,
      },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const contactTransactions = async (req, res) => {
  const { business_id } = req.user;
  const { contact_id } = req.params;

  try {
    const [transactions, contact] = await Promise.all([
      Transaction.find({
        business_id,
        "contact._id": contact_id,
        status: { $ne: STATUS.DELETED },
      }).sort({ created_at: 1 }),
      Contact.findOne({
        _id: contact_id,
        business_id,
      }),
    ]);

    if (!contact) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CONTACT_NOT_FOUND,
      });
    }

    let runningBalance = 0;
    const withBalance = transactions.map((transaction) => {
      const isCredit = ["credit", "received"].includes(
        transaction.transaction_type
      );
      runningBalance += isCredit ? transaction.amount : -transaction.amount;

      return {
        ...transaction.toObject(),
        balance_after: runningBalance,
      };
    });

    withBalance.reverse();

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        transactions: withBalance,
        total_transactions: withBalance.length,
        contact_balance: contact.balance,
      },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const report = async (req, res) => {
  try {
    const { business_id } = req.user;
    const { start, end } = req.query;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (!start || !end || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.RESPONSE_MESSAGES.INVALID_REQUEST,
      });
    }

    const businessObjectId = new mongoose.Types.ObjectId(String(business_id));

    const [txResult, topContacts] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            business_id: businessObjectId,
            status: { $ne: STATUS.DELETED },
            created_at: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  collected: {
                    $sum: {
                      $cond: [{ $in: ["$transaction_type", ["credit", "received"]] }, "$amount", 0],
                    },
                  },
                  given: {
                    $sum: {
                      $cond: [{ $in: ["$transaction_type", ["debit", "sent"]] }, "$amount", 0],
                    },
                  },
                  transaction_count: { $sum: 1 },
                },
              },
            ],
            daily: [
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at", timezone: "Asia/Kolkata" } },
                  collected: {
                    $sum: {
                      $cond: [{ $in: ["$transaction_type", ["credit", "received"]] }, "$amount", 0],
                    },
                  },
                  given: {
                    $sum: {
                      $cond: [{ $in: ["$transaction_type", ["debit", "sent"]] }, "$amount", 0],
                    },
                  },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]),
      Contact.aggregate([
        { $match: { business_id: businessObjectId, status: { $ne: STATUS.DELETED } } },
        { $addFields: { absBalance: { $abs: "$balance" } } },
        { $match: { absBalance: { $gt: 0 } } },
        { $sort: { absBalance: -1 } },
        { $limit: 5 },
        { $project: { name: 1, phone: 1, balance: 1, link_status: 1 } },
      ]),
    ]);

    const totals = txResult[0]?.totals?.[0] || { collected: 0, given: 0, transaction_count: 0 };
    const daily = (txResult[0]?.daily || []).map((d) => ({
      date: d._id,
      collected: d.collected,
      given: d.given,
    }));

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        totals: {
          collected: totals.collected,
          given: totals.given,
          net: totals.collected - totals.given,
          transaction_count: totals.transaction_count,
        },
        daily,
        top_contacts: topContacts,
      },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const transaction = async (req, res) => {
  const { business_id } = req.user;
  const { id } = req.params;

  const transaction = await Transaction.findOne({
    _id: id,
    business_id,
    status: STATUS.ACTIVE,
  });
  if (!transaction) {
    return res.status(STATUS_CODES.NOT_FOUND).json({
      success: false,
      message: MESSAGES.ERROR_MESSAGES.TRANSACTION_NOT_FOUND,
    });
  }

  return res.status(STATUS_CODES.SUCCESS).json({
    success: true,
    transaction: await withAttachmentUrl(transaction),
  });
};

export const update = async (req, res) => {
  try {
    const { business_id } = req.user;
    const { id } = req.params;

    const existing = await Transaction.findOne({
      _id: id,
      business_id,
      status: STATUS.ACTIVE,
    });

    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.TRANSACTION_NOT_FOUND,
      });
    }

    if (existing.mirror_of) {
      return res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.MIRRORED_READ_ONLY,
      });
    }

    const patch = {};

    if (req.body.amount != null) {
      if (!(Number(req.body.amount) > 0)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.INVALID_AMOUNT,
        });
      }
      if (Number(req.body.amount) > MAX_AMOUNT) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.AMOUNT_TOO_LARGE,
        });
      }
      patch.amount = req.body.amount;
    }

    if (req.body.transaction_type != null) {
      const transaction_type = normalizeTransactionType(
        req.body.transaction_type
      );
      if (!transaction_type) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.INVALID_TRANSACTION_TYPE,
        });
      }
      patch.transaction_type = transaction_type;
    }

    if (req.body.description != null) patch.description = req.body.description;
    if (req.body.payment_mode != null)
      patch.payment_mode = req.body.payment_mode;
    if (req.body.attachment_key != null) patch.attachment_key = req.body.attachment_key;
    if (req.body.transaction_date != null) {
      const parsedDate = new Date(req.body.transaction_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.INVALID_TRANSACTION_DATE,
        });
      }
      patch.created_at = parsedDate;
    }

    const updateOptions = { new: true };
    if (patch.created_at) {
      updateOptions.timestamps = false;
      updateOptions.overwriteImmutable = true;
      patch.updated_at = new Date();
    }

    const updated = await Transaction.findByIdAndUpdate(
      id,
      patch,
      updateOptions
    );

    const contact_balance = await recomputeContactBalance(
      updated.contact._id
    );

    await mirrorTransactionUpdate(updated);

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { transaction: await withAttachmentUrl(updated), contact_balance },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const remove = async (req, res) => {
  try {
    const { business_id } = req.user;
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      _id: id,
      business_id,
      status: STATUS.ACTIVE,
    });
    if (!transaction) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.TRANSACTION_NOT_FOUND,
      });
    }

    if (transaction.mirror_of) {
      return res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.MIRRORED_READ_ONLY,
      });
    }

    await Transaction.findByIdAndUpdate(id, { status: STATUS.DELETED });
    await mirrorTransactionDelete(transaction);

    const contact_balance = await recomputeContactBalance(
      transaction.contact._id,
      { transactionCountDelta: -1 }
    );

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { contact_balance },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
