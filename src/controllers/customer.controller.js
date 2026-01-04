import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import Customer from "../models/customer.model.js";
import Transaction from "../models/transaction.model.js";

export const create = async (req, res) => {
  try {
    const { phone } = req.body;

    const customer = await Customer.findOne({ phone });

    if (customer) {
      if (customer.status === STATUS.ACTIVE) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.CUSTOMER_ALREADY_EXISTS,
        });
      }

      if (customer.status === STATUS.DELETED) {
        const updatedCustomer = await Customer.findByIdAndUpdate(
          customer._id,
          { status: STATUS.ACTIVE, balance: 0 },
          { new: true }
        );

        return res.status(STATUS_CODES.SUCCESS).json({
          success: true,
          customer: updatedCustomer,
        });
      }
    }

    const newCustomer = await Customer.create(req.body);
    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      customer: newCustomer,
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const customers = async (req, res) => {
  const { business } = req.user;

  try {
    const customers = await Customer.find({
      "business._id": business._id,
      status: STATUS.ACTIVE,
    }).sort({ created_at: -1 });
    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { customers },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const customer = async (req, res) => {
  const { business } = req.user;

  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      "business._id": business._id,
      status: STATUS.ACTIVE,
    });
    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { customer },
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

    const customer = await Customer.findOne({ _id: id, status: STATUS.ACTIVE });

    if (!customer) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
      });
    }

    const existCustomer = await Customer.findOne({
      _id: { $ne: id },
      phone: req.body.phone,
      status: STATUS.ACTIVE,
    });
    if (existCustomer) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CUSTOMER_ALREADY_EXISTS,
      });
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      customer: updatedCustomer,
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

    const customer = await Customer.findOne({ _id: id, status: STATUS.ACTIVE });
    if (!customer) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
      });
    }

    await Customer.findByIdAndUpdate(
      id,
      { status: STATUS.DELETED },
      { new: true }
    );

    await Transaction.updateMany(
      { "customer._id": id },
      { status: STATUS.DELETED }
    );

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
