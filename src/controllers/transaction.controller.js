import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import { getSearchFilterQuery } from "../helpers/functions.js";
import Transaction from "../models/transaction.model.js";
import {
  updateCustomerBalance,
  updateBusinessStats,
} from "../helpers/functions.js";
import Customer from "../models/customer.model.js";

export const create = async (req, res) => {
  try {
    const transaction = await Transaction.create(req.body);

    await updateCustomerBalance(
      transaction.customer._id,
      transaction.amount,
      transaction.transaction_type
    );

    await updateBusinessStats(
      transaction.business._id,
      transaction.amount,
      transaction.transaction_type
    );

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { transaction },
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
      }).sort({ created_at: -1 }),
      Customer.findById(customer_id),
    ]);

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        transactions,
        customer_balance: customer?.balance || 0,
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
  const { id } = req.params;

  const transaction = await Transaction.findOne({
    _id: id,
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
    const { id } = req.params;

    const existing = await Transaction.findOne({
      _id: id,
      status: STATUS.ACTIVE,
    });

    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.TRANSACTION_NOT_FOUND,
      });
    }

    await updateCustomerBalance(
      existing.customer._id,
      existing.amount,
      existing.transaction_type,
      "subtract"
    );

    await updateBusinessStats(
      existing.business._id,
      existing.amount,
      existing.transaction_type,
      "subtract"
    );

    const updated = await Transaction.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    await updateCustomerBalance(
      updated.customer._id,
      updated.amount,
      updated.transaction_type,
      "add"
    );

    await updateBusinessStats(
      updated.business._id,
      updated.amount,
      updated.transaction_type,
      "add"
    );

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { transaction: updated },
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
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      _id: id,
      status: STATUS.ACTIVE,
    });
    if (!transaction) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.TRANSACTION_NOT_FOUND,
      });
    }

    await updateCustomerBalance(
      transaction.customer._id,
      transaction.amount,
      transaction.transaction_type,
      "subtract"
    );

    await updateBusinessStats(
      transaction.business._id,
      transaction.amount,
      transaction.transaction_type,
      "subtract"
    );

    await Transaction.findByIdAndUpdate(id, { status: STATUS.DELETED });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
