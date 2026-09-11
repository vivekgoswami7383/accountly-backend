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
    const { business } = req.user;
    const { customer, amount, description, payment_mode } = req.body;

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
      "business._id": business._id,
      status: { $ne: STATUS.DELETED },
    });

    if (!customerDoc) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
      });
    }

    const transaction = await Transaction.create({
      business: { _id: business._id, business_name: business.business_name },
      customer: { _id: customerDoc._id, name: customerDoc.name },
      amount,
      transaction_type,
      payment_mode,
      description: description || "",
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
  const { business } = req.user;

  const { query: filter, sort } = getSearchFilterQuery(req.query.filter);

  filter.$and.push({ "business._id": { $eq: business._id } });

  try {
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
  const { business } = req.user;
  const { customer_id } = req.params;

  try {
    const [transactions, customer] = await Promise.all([
      Transaction.find({
        "business._id": business._id,
        "customer._id": customer_id,
        status: { $ne: STATUS.DELETED },
      }).sort({ created_at: 1 }),
      Customer.findOne({
        _id: customer_id,
        "business._id": business._id,
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
  const { business } = req.user;
  const { id } = req.params;

  const transaction = await Transaction.findOne({
    _id: id,
    "business._id": business._id,
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
    const { business } = req.user;
    const { id } = req.params;

    const existing = await Transaction.findOne({
      _id: id,
      "business._id": business._id,
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
    if (req.body.payment_mode != null) patch.payment_mode = req.body.payment_mode;

    const updated = await Transaction.findByIdAndUpdate(id, patch, {
      new: true,
    });

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
    const { business } = req.user;
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      _id: id,
      "business._id": business._id,
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
