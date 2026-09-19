import { STATUS_CODES, STATUS, MESSAGES } from "../helpers/constants.js";
import { getSignedUrlFor } from "../utils/s3.js";
import Business from "../models/business.model.js";
import BusinessStats from "../models/business-stats.model.js";
import Contact from "../models/contact.model.js";
import Transaction from "../models/transaction.model.js";

const withImageUrl = async (contact) => {
  const obj = contact.toObject ? contact.toObject() : contact;
  return { ...obj, image_url: await getSignedUrlFor(obj.image_key) };
};

export const statistics = async (req, res) => {
  try {
    const requestUser = req.user;

    const business = await Business.findOne({
      _id: requestUser.business_id,
      status: STATUS.ACTIVE,
    });

    if (!business) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.BUSINESS_NOT_FOUND,
      });
    }

    const [stats, contacts, transactions] = await Promise.all([
      BusinessStats.findOne({ business_id: business._id }),
      Contact.find({ business_id: business._id, status: STATUS.ACTIVE })
        .sort({ updated_at: -1 })
        .limit(3),
      Transaction.find({
        business_id: business._id,
        status: { $ne: STATUS.DELETED },
      })
        .sort({ created_at: -1 })
        .limit(3),
    ]);

    const receivable = stats?.receivable || 0;
    const payable = stats?.payable || 0;

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        stats: {
          receivable,
          payable,
          net: receivable - payable,
          contact_count: stats?.contact_count || 0,
          total_transactions: stats?.total_transactions || 0,
        },
        recent_contacts: await Promise.all(contacts.map(withImageUrl)),
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
