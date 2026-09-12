import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import {
  getSearchFilterQuery,
  normalizeTransactionType,
  recomputeCustomerBalance,
} from "../helpers/functions.js";
import Transaction from "../models/transaction.model.js";
import Customer from "../models/customer.model.js";

export const create = async (req, res) => {
  try {
    const { business_id } = req.user;
    const { customer, amount, description, payment_mode, transaction_date } =
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

    const customerDoc = await Customer.findOne({
      _id: customer?._id,
      business_id,
      status: { $ne: STATUS.DELETED },
    });

    if (!customerDoc) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
      });
    }

    const transaction = await Transaction.create({
      business_id,
      customer: { _id: customerDoc._id, name: customerDoc.name },
      amount,
      transaction_type,
      payment_mode,
      description: description || "",
      ...(transaction_date ? { created_at: new Date(transaction_date) } : {}),
    });

    const customer_balance = await recomputeCustomerBalance(customerDoc._id, {
      transactionCountDelta: 1,
    });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { transaction, customer_balance },
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

export const customerTransactions = async (req, res) => {
  const { business_id } = req.user;
  const { customer_id } = req.params;

  try {
    const [transactions, customer] = await Promise.all([
      Transaction.find({
        business_id,
        "customer._id": customer_id,
        status: { $ne: STATUS.DELETED },
      }).sort({ created_at: 1 }),
      Customer.findOne({
        _id: customer_id,
        business_id,
      }),
    ]);

    if (!customer) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
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
        customer_balance: customer.balance,
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
    transaction,
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

    const patch = {};

    if (req.body.amount != null) {
      if (!(Number(req.body.amount) > 0)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.INVALID_AMOUNT,
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

    const customer_balance = await recomputeCustomerBalance(
      updated.customer._id
    );

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { transaction: updated, customer_balance },
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

    await Transaction.findByIdAndUpdate(id, { status: STATUS.DELETED });

    const customer_balance = await recomputeCustomerBalance(
      transaction.customer._id,
      { transactionCountDelta: -1 }
    );

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { customer_balance },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
