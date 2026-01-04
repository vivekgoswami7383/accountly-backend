import { STATUS_CODES, STATUS, MESSAGES } from "../helpers/constants.js";
import Business from "../models/business.model.js";
import Customer from "../models/customer.model.js";
import Transaction from "../models/transaction.model.js";

export const statistics = async (req, res) => {
  try {
    const requestUser = req.user;

    const business = await Business.findOne({
      _id: requestUser.business._id,
      status: STATUS.ACTIVE,
    });

    if (!business) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.BUSINESS_NOT_FOUND,
      });
    }

    const stats = business?.transaction_stats || {
      total_sent: 0,
      total_received: 0,
      total_transactions: 0,
    };

    const customers = await Customer.find({
      "business._id": business._id,
      status: STATUS.ACTIVE,
    })
      .sort({ created_at: -1 })
      .limit(3);

    const transactions = await Transaction.find({
      "business._id": business._id,
      status: STATUS.ACTIVE,
    })
      .sort({ created_at: -1 })
      .limit(3);

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        stats: {
          total_sent: stats.total_sent,
          total_received: stats.total_received,
          pending: stats.total_sent - stats.total_received,
          total_transactions: stats.total_transactions,
        },
        recent_customers: customers,
        recent_transactions: transactions,
      },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
