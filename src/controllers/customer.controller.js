import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import Customer from "../models/customer.model.js";

export const create = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      phone: req.body.phone,
      status: STATUS.ACTIVE,
    });
    if (customer) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CUSTOMER_ALREADY_EXISTS,
      });
    }

    await Customer.create(req.body);

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

export const customers = async (req, res) => {
  const { business_id } = req.user;

  try {
    const customers = await Customer.find({
      business_id,
      status: STATUS.ACTIVE,
    });
    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      customers,
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
