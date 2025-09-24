import { STATUS, STATUS_CODES } from "../helpers/constants.js";
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
    const transactions = await Transaction.find({
      "business._id": business._id,
      "customer._id": customer_id,
      status: { $ne: STATUS.DELETED },
    }).sort({ created_at: -1 });

    const customer = await Customer.findById(customer_id);
    const stats = customer?.transaction_stats || {
      total_sent: 0,
      total_received: 0,
      total_transactions: 0,
    };

    const pending = stats.total_sent - stats.total_received;

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        transactions,
        total_sent: stats.total_sent,
        total_received: stats.total_received,
        pending,
        total_transactions: stats.total_transactions,
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
