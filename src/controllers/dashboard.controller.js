import { STATUS_CODES, STATUS, MESSAGES } from "../helpers/constants.js";
import Business from "../models/business.model.js";
import BusinessStats from "../models/business-stats.model.js";
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

    const [stats, customers, transactions] = await Promise.all([
      BusinessStats.findById(business._id),
      Customer.find({ "business._id": business._id, status: STATUS.ACTIVE })
        .sort({ updated_at: -1 })
        .limit(3),
      Transaction.find({
        "business._id": business._id,
        status: { $ne: STATUS.DELETED },
      })
        .sort({ created_at: -1 })
        .limit(3),
    ]);

    const you_will_get = stats?.you_will_get || 0;
    const you_will_give = stats?.you_will_give || 0;

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        stats: {
          you_will_get,
          you_will_give,
          net: you_will_get - you_will_give,
          customer_count: stats?.customer_count || 0,
          total_transactions: stats?.total_transactions || 0,
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
