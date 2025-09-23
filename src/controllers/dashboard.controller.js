import { STATUS_CODES, STATUS } from "../helpers/constants.js";
import Business from "../models/business.model.js";
import Customer from "../models/customer.model.js";

export const statistics = async (req, res) => {
  try {
    const requestUser = req.user;

    const business = await Business.findOne({
      _id: requestUser.business._id,
      status: STATUS.ACTIVE,
    });

    const stats = business.transaction_stats || {
      total_sent: 0,
      total_received: 0,
      total_pending: 0,
      total_transactions: 0,
    };

    const customers = await Customer.find({
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
          pending: stats.total_pending,
          total_transactions: stats.total_transactions,
        },
        recent_customers: customers,
      },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
