import { MAX_NAME_LENGTH, MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import Customer from "../models/customer.model.js";
import Transaction from "../models/transaction.model.js";
import { adjustBusinessStats, balanceBucket } from "../helpers/functions.js";
import { getSignedUrlFor } from "../utils/s3.js";
import { endLink } from "../services/ledger-link.service.js";
import Link, { LINK_STATUS } from "../models/link.model.js";

const withImageUrl = async (customer) => {
  if (!customer) return customer;
  const obj = customer.toObject ? customer.toObject() : customer;
  return { ...obj, image_url: await getSignedUrlFor(obj.image_key) };
};

export const create = async (req, res) => {
  try {
    const { business_id } = req.user;
    const { phone, name, address } = req.body;

    const customer = await Customer.findOne({
      phone,
      business_id,
    });

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
          { status: STATUS.ACTIVE, balance: 0, name, address },
          { new: true }
        );

        await adjustBusinessStats(business_id, { customer_count: 1 });

        return res.status(STATUS_CODES.SUCCESS).json({
          success: true,
          customer: await withImageUrl(updatedCustomer),
        });
      }
    }

    const newCustomer = await Customer.create({
      business_id,
      name,
      phone,
      address,
    });

    await adjustBusinessStats(business_id, { customer_count: 1 });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      customer: await withImageUrl(newCustomer),
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
  const { page, limit } = req.query;

  try {
    const baseFilter = { business_id, status: STATUS.ACTIVE };

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

      const [customers, total] = await Promise.all([
        Customer.find(baseFilter)
          .sort({ created_at: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        Customer.countDocuments(baseFilter),
      ]);

      return res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        data: {
          customers: await Promise.all(customers.map(withImageUrl)),
          total,
          has_more: (pageNum - 1) * limitNum + customers.length < total,
        },
      });
    }

    const customers = await Customer.find(baseFilter).sort({ created_at: -1 });
    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { customers: await Promise.all(customers.map(withImageUrl)) },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const customer = async (req, res) => {
  const { business_id } = req.user;

  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      business_id,
      status: STATUS.ACTIVE,
    });
    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { customer: await withImageUrl(customer) },
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
    const { business_id } = req.user;
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      business_id,
      status: STATUS.ACTIVE,
    });

    if (!customer) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
      });
    }

    if (
      customer.link_id &&
      req.body.phone != null &&
      req.body.phone !== customer.phone
    ) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.LINK_PHONE_LOCKED,
      });
    }

    if (req.body.phone) {
      const existCustomer = await Customer.findOne({
        _id: { $ne: id },
        phone: req.body.phone,
        business_id: customer.business_id,
        status: STATUS.ACTIVE,
      });
      if (existCustomer) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.CUSTOMER_ALREADY_EXISTS,
        });
      }
    }

    if (req.body.name != null && req.body.name.length > MAX_NAME_LENGTH) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.NAME_TOO_LONG,
      });
    }

    const patch = {};
    if (req.body.name != null) patch.name = req.body.name;
    if (req.body.phone != null) patch.phone = req.body.phone;
    if (req.body.address != null) patch.address = req.body.address;
    if (req.body.image_key != null) patch.image_key = req.body.image_key;

    const updatedCustomer = await Customer.findByIdAndUpdate(id, patch, {
      new: true,
    });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      customer: await withImageUrl(updatedCustomer),
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
    const { business_id } = req.user;
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      business_id,
      status: STATUS.ACTIVE,
    });
    if (!customer) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CUSTOMER_NOT_FOUND,
      });
    }

    const activeTransactionCount = await Transaction.countDocuments({
      "customer._id": id,
      status: STATUS.ACTIVE,
    });

    if (customer.link_id) {
      const link = await Link.findById(customer.link_id);
      if (
        link &&
        [LINK_STATUS.ACTIVE, LINK_STATUS.PENDING].includes(link.status)
      ) {
        await endLink(link, LINK_STATUS.UNLINKED, {
          responded_by: req.user._id,
        });
      }
    }

    await Customer.findByIdAndUpdate(
      id,
      { status: STATUS.DELETED },
      { new: true }
    );

    await Transaction.updateMany(
      { "customer._id": id, status: STATUS.ACTIVE },
      { status: STATUS.DELETED }
    );

    const before = balanceBucket(customer.balance);
    await adjustBusinessStats(business_id, {
      receivable: -before.get,
      payable: -before.give,
      customer_count: -1,
      total_transactions: -activeTransactionCount,
    });

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
