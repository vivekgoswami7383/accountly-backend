import { CONTACT_TYPES, MAX_NAME_LENGTH, MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import Contact from "../models/contact.model.js";
import Transaction from "../models/transaction.model.js";
import { adjustBusinessStats, balanceBucket } from "../helpers/functions.js";
import { getSignedUrlFor } from "../utils/s3.js";

const withImageUrl = async (contact) => {
  if (!contact) return contact;
  const obj = contact.toObject ? contact.toObject() : contact;
  return { ...obj, image_url: await getSignedUrlFor(obj.image_key) };
};

export const create = async (req, res) => {
  try {
    const { business_id } = req.user;
    const { phone, name, address } = req.body;
    const type = CONTACT_TYPES.includes(req.body.type) ? req.body.type : null;

    const contact = await Contact.findOne({
      phone,
      business_id,
    });

    if (contact) {
      if (contact.status === STATUS.ACTIVE) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.CONTACT_ALREADY_EXISTS,
        });
      }

      if (contact.status === STATUS.DELETED) {
        const updatedContact = await Contact.findByIdAndUpdate(
          contact._id,
          { status: STATUS.ACTIVE, balance: 0, name, address, type },
          { new: true }
        );

        await adjustBusinessStats(business_id, { contact_count: 1 });

        return res.status(STATUS_CODES.SUCCESS).json({
          success: true,
          contact: await withImageUrl(updatedContact),
        });
      }
    }

    const newContact = await Contact.create({
      business_id,
      name,
      phone,
      address,
      type,
    });

    await adjustBusinessStats(business_id, { contact_count: 1 });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      contact: await withImageUrl(newContact),
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const contacts = async (req, res) => {
  const { business_id } = req.user;
  const { page, limit } = req.query;

  try {
    const baseFilter = { business_id, status: STATUS.ACTIVE };
    if (CONTACT_TYPES.includes(req.query.type)) {
      baseFilter.type = req.query.type;
    } else if (req.query.type === "none") {
      baseFilter.type = null;
    }

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

      const [contacts, total] = await Promise.all([
        Contact.find(baseFilter)
          .sort({ created_at: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        Contact.countDocuments(baseFilter),
      ]);

      return res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        data: {
          contacts: await Promise.all(contacts.map(withImageUrl)),
          total,
          has_more: (pageNum - 1) * limitNum + contacts.length < total,
        },
      });
    }

    const contacts = await Contact.find(baseFilter).sort({ created_at: -1 });
    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { contacts: await Promise.all(contacts.map(withImageUrl)) },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const contact = async (req, res) => {
  const { business_id } = req.user;

  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      business_id,
      status: STATUS.ACTIVE,
    });
    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { contact: await withImageUrl(contact) },
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

    const contact = await Contact.findOne({
      _id: id,
      business_id,
      status: STATUS.ACTIVE,
    });

    if (!contact) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CONTACT_NOT_FOUND,
      });
    }

    if (req.body.phone) {
      const existContact = await Contact.findOne({
        _id: { $ne: id },
        phone: req.body.phone,
        business_id: contact.business_id,
        status: STATUS.ACTIVE,
      });
      if (existContact) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.ERROR_MESSAGES.CONTACT_ALREADY_EXISTS,
        });
      }
    }

    const typeProvided = req.body.type !== undefined;
    const nextType = req.body.type || null;
    if (typeProvided && nextType !== null && !CONTACT_TYPES.includes(nextType)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.INVALID_CONTACT_TYPE,
      });
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
    if (typeProvided) patch.type = nextType;
    if (req.body.image_key != null) patch.image_key = req.body.image_key;

    const updatedContact = await Contact.findByIdAndUpdate(id, patch, {
      new: true,
    });

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      contact: await withImageUrl(updatedContact),
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

    const contact = await Contact.findOne({
      _id: id,
      business_id,
      status: STATUS.ACTIVE,
    });
    if (!contact) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.CONTACT_NOT_FOUND,
      });
    }

    const activeTransactionCount = await Transaction.countDocuments({
      "contact._id": id,
      status: STATUS.ACTIVE,
    });

    await Contact.findByIdAndUpdate(
      id,
      { status: STATUS.DELETED },
      { new: true }
    );

    await Transaction.updateMany(
      { "contact._id": id, status: STATUS.ACTIVE },
      { status: STATUS.DELETED }
    );

    const before = balanceBucket(contact.balance);
    await adjustBusinessStats(business_id, {
      receivable: -before.get,
      payable: -before.give,
      contact_count: -1,
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
