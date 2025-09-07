import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import Transaction from "../models/transaction.model.js";

export const create = async (req, res) => {
  try {
    const { business_id, business_name } = req.user; // Get business info from authenticated user

    // Add business reference to transaction data
    const transactionData = {
      ...req.body,
      business: {
        _id: business_id,
        business_name: business_name,
      },
    };

    const transaction = await Transaction.create(transactionData);

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
  const { business_id } = req.user;

  try {
    const transactions = await Transaction.find({
      "business._id": business_id,
    }).sort({ created_at: -1 });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!transaction) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      transaction,
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
    const transaction = await Transaction.findByIdAndDelete(id);

    if (!transaction) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
