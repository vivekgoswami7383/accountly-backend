import { CONTACT_LABELS, MAX_NAME_LENGTH, MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import Contact from "../models/contact.model.js";
import Transaction from "../models/transaction.model.js";
import { adjustBusinessStats, balanceBucket } from "../helpers/functions.js";
import { getSignedUrlFor } from "../utils/s3.js";
import { endLink } from "../services/ledger-link.service.js";
import Link, { LINK_STATUS } from "../models/link.model.js";

const withImageUrl = async (contact) => {
  if (!contact) return contact;
  const obj = contact.toObject ? contact.toObject() : contact;
  return { ...obj, image_url: await getSignedUrlFor(obj.image_key) };
};

export const create = async (req, res) => {
  try {
    const { business_id } = req.user;
    const { phone, name, address } = req.body;
    const label = CONTACT_LABELS.includes(req.body.label) ? req.body.label : null;

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
          { status: STATUS.ACTIVE, balance: 0, name, address, label },
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
      label,
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
    if (CONTACT_LABELS.includes(req.query.label)) {
      baseFilter.label = req.query.label;
    } else if (req.query.label === "none") {
      baseFilter.label = null;
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

    if (
      contact.link_id &&
      req.body.phone != null &&
      req.body.phone !== contact.phone
    ) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.LINK_PHONE_LOCKED,
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

    const labelProvided = req.body.label !== undefined;
    const nextLabel = req.body.label || null;
    if (labelProvided && nextLabel !== null && !CONTACT_LABELS.includes(nextLabel)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR_MESSAGES.INVALID_CONTACT_LABEL,
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
    if (labelProvided) patch.label = nextLabel;
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

    if (contact.link_id) {
      const link = await Link.findById(contact.link_id);
      if (
        link &&
        [LINK_STATUS.ACTIVE, LINK_STATUS.PENDING].includes(link.status)
      ) {
        await endLink(link, LINK_STATUS.UNLINKED, {
          responded_by: req.user._id,
        });
      }
    }

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
