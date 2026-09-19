import mongoose from "mongoose";
import {
  INVERSE_CONTACT_TYPE,
  MESSAGES,
  STATUS,
  STATUS_CODES,
  USER_ROLES,
} from "../helpers/constants.js";
import { adjustBusinessStats } from "../helpers/functions.js";
import Contact from "../models/contact.model.js";
import Link, { LINK_STATUS } from "../models/link.model.js";
import {
  buildPairKey,
  endLink,
  resyncLink,
} from "../services/ledger-link.service.js";

const User = mongoose.model("User");
const Business = mongoose.model("Business");

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const findLinkableTarget = async (phone, ownBusinessId) => {
  const owner = await User.findOne({
    phone,
    role: USER_ROLES.OWNER,
    status: STATUS.ACTIVE,
    business_id: { $ne: null },
  }).lean();
  if (!owner || String(owner.business_id) === String(ownBusinessId)) {
    return null;
  }
  const business = await Business.findOne({
    _id: owner.business_id,
    status: STATUS.ACTIVE,
  }).lean();
  return business ? { owner, business } : null;
};

const serializeLink = (link) => ({
  id: link._id,
  status: link.status,
  requested_at: link.created_at,
  accepted_at: link.accepted_at,
});

const findOwnedContact = (business_id, id) =>
  Contact.findOne({ _id: id, business_id, status: STATUS.ACTIVE });

export const lookup = async (req, res) => {
  try {
    const { business_id } = req.user;
    const contact = await findOwnedContact(
      business_id,
      req.query.contact_id
    );
    if (!contact) {
      return fail(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.ERROR_MESSAGES.CONTACT_NOT_FOUND
      );
    }

    if (contact.link_status) {
      return res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        data: { status: contact.link_status, link_id: contact.link_id },
      });
    }

    const target = await findLinkableTarget(contact.phone, business_id);
    if (!target) {
      return res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        data: { status: "unavailable" },
      });
    }

    const pending = await Link.findOne({
      pair_key: buildPairKey(business_id, target.business._id),
      status: LINK_STATUS.PENDING,
      target_business_id: business_id,
    }).lean();

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: pending
        ? { status: "incoming", link_id: pending._id }
        : { status: "available" },
    });
  } catch (error) {
    return fail(res, STATUS_CODES.INTERNAL_SERVER_ERROR, error.message);
  }
};

export const request = async (req, res) => {
  try {
    const { business_id, _id: userId } = req.user;
    const contact = await findOwnedContact(
      business_id,
      req.body.contact_id
    );
    if (!contact) {
      return fail(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.ERROR_MESSAGES.CONTACT_NOT_FOUND
      );
    }
    if (contact.link_id) {
      return fail(
        res,
        STATUS_CODES.CONFLICT,
        MESSAGES.ERROR_MESSAGES.LINK_ALREADY_EXISTS
      );
    }

    const target = await findLinkableTarget(contact.phone, business_id);
    if (!target) {
      return fail(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.ERROR_MESSAGES.LINK_CONTACT_NOT_ON_APP
      );
    }

    const pairKey = buildPairKey(business_id, target.business._id);
    const existing = await Link.findOne({ pair_key: pairKey });

    if (existing) {
      if (existing.status === LINK_STATUS.BLOCKED) {
        const blockedByMe =
          String(existing.blocked_by_business_id) === String(business_id);
        return fail(
          res,
          STATUS_CODES.FORBIDDEN,
          blockedByMe
            ? MESSAGES.ERROR_MESSAGES.LINK_BLOCKED_BY_YOU
            : MESSAGES.ERROR_MESSAGES.LINK_UNAVAILABLE
        );
      }
      if (
        existing.status === LINK_STATUS.ACTIVE ||
        existing.status === LINK_STATUS.PENDING
      ) {
        return fail(
          res,
          STATUS_CODES.CONFLICT,
          MESSAGES.ERROR_MESSAGES.LINK_ALREADY_EXISTS
        );
      }
    }

    const fields = {
      requester_business_id: business_id,
      target_business_id: target.business._id,
      requester_contact_id: contact._id,
      target_contact_id: null,
      requested_by: userId,
      responded_by: null,
      blocked_by_business_id: null,
      accepted_at: null,
      status: LINK_STATUS.PENDING,
    };

    const link = existing
      ? await Link.findByIdAndUpdate(existing._id, fields, { new: true })
      : await Link.create({ pair_key: pairKey, ...fields });

    await Contact.updateOne(
      { _id: contact._id },
      { $set: { link_id: link._id, link_status: LINK_STATUS.PENDING } }
    );

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { link: serializeLink(link) },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return fail(
        res,
        STATUS_CODES.CONFLICT,
        MESSAGES.ERROR_MESSAGES.LINK_ALREADY_EXISTS
      );
    }
    return fail(res, STATUS_CODES.INTERNAL_SERVER_ERROR, error.message);
  }
};

export const incoming = async (req, res) => {
  try {
    const { business_id } = req.user;
    const links = await Link.find({
      target_business_id: business_id,
      status: LINK_STATUS.PENDING,
    })
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    const businesses = await Business.find({
      _id: { $in: links.map((link) => link.requester_business_id) },
    })
      .select("business_name")
      .lean();
    const nameById = new Map(
      businesses.map((business) => [String(business._id), business.business_name])
    );

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        requests: links.map((link) => ({
          id: link._id,
          business_name:
            nameById.get(String(link.requester_business_id)) || "",
          requested_at: link.created_at,
        })),
      },
    });
  } catch (error) {
    return fail(res, STATUS_CODES.INTERNAL_SERVER_ERROR, error.message);
  }
};

const loadPendingForTarget = async (req, res) => {
  const link = await Link.findOne({
    _id: req.params.id,
    target_business_id: req.user.business_id,
  });
  if (!link) {
    fail(
      res,
      STATUS_CODES.NOT_FOUND,
      MESSAGES.ERROR_MESSAGES.LINK_NOT_FOUND
    );
    return null;
  }
  if (link.status !== LINK_STATUS.PENDING) {
    fail(
      res,
      STATUS_CODES.CONFLICT,
      MESSAGES.ERROR_MESSAGES.LINK_INVALID_STATE
    );
    return null;
  }
  return link;
};

export const accept = async (req, res) => {
  try {
    const { business_id, _id: userId } = req.user;
    const link = await loadPendingForTarget(req, res);
    if (!link) return null;

    const requesterBusiness = await Business.findById(
      link.requester_business_id
    ).lean();
    const requesterOwner = requesterBusiness
      ? await User.findById(requesterBusiness.user._id).lean()
      : null;
    if (!requesterBusiness || !requesterOwner) {
      return fail(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.ERROR_MESSAGES.LINK_NOT_FOUND
      );
    }

    const requesterContact = await Contact.findById(
      link.requester_contact_id
    ).lean();
    const inverseType =
      INVERSE_CONTACT_TYPE[requesterContact?.contact_type] || null;

    let counterpart = await Contact.findOne({
      business_id,
      phone: requesterOwner.phone,
    });

    if (!counterpart) {
      counterpart = await Contact.create({
        business_id,
        name: requesterBusiness.business_name,
        phone: requesterOwner.phone,
        contact_type: inverseType,
      });
      await adjustBusinessStats(business_id, { contact_count: 1 });
    } else if (counterpart.status === STATUS.DELETED) {
      counterpart = await Contact.findByIdAndUpdate(
        counterpart._id,
        {
          status: STATUS.ACTIVE,
          balance: 0,
          name: requesterBusiness.business_name,
          contact_type: inverseType,
        },
        { new: true }
      );
      await adjustBusinessStats(business_id, { contact_count: 1 });
    }

    if (counterpart.link_id) {
      return fail(
        res,
        STATUS_CODES.CONFLICT,
        MESSAGES.ERROR_MESSAGES.LINK_ALREADY_EXISTS
      );
    }

    const updated = await Link.findByIdAndUpdate(
      link._id,
      {
        status: LINK_STATUS.ACTIVE,
        target_contact_id: counterpart._id,
        responded_by: userId,
        accepted_at: new Date(),
      },
      { new: true }
    );

    await Contact.updateMany(
      { _id: { $in: [link.requester_contact_id, counterpart._id] } },
      { $set: { link_id: link._id, link_status: LINK_STATUS.ACTIVE } }
    );

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { link: serializeLink(updated), contact_id: counterpart._id },
    });
  } catch (error) {
    return fail(res, STATUS_CODES.INTERNAL_SERVER_ERROR, error.message);
  }
};

export const decline = async (req, res) => {
  try {
    const link = await loadPendingForTarget(req, res);
    if (!link) return null;

    await endLink(link, LINK_STATUS.DECLINED, { responded_by: req.user._id });
    return res.status(STATUS_CODES.SUCCESS).json({ success: true, data: {} });
  } catch (error) {
    return fail(res, STATUS_CODES.INTERNAL_SERVER_ERROR, error.message);
  }
};

export const block = async (req, res) => {
  try {
    const link = await loadPendingForTarget(req, res);
    if (!link) return null;

    await endLink(link, LINK_STATUS.BLOCKED, {
      responded_by: req.user._id,
      blocked_by_business_id: req.user.business_id,
    });
    return res.status(STATUS_CODES.SUCCESS).json({ success: true, data: {} });
  } catch (error) {
    return fail(res, STATUS_CODES.INTERNAL_SERVER_ERROR, error.message);
  }
};

export const blocked = async (req, res) => {
  try {
    const { business_id } = req.user;
    const links = await Link.find({
      blocked_by_business_id: business_id,
      status: LINK_STATUS.BLOCKED,
    })
      .sort({ updated_at: -1 })
      .limit(100)
      .lean();

    const otherIds = links.map((link) =>
      String(link.requester_business_id) === String(business_id)
        ? link.target_business_id
        : link.requester_business_id
    );
    const businesses = await Business.find({ _id: { $in: otherIds } })
      .select("business_name")
      .lean();
    const nameById = new Map(
      businesses.map((business) => [String(business._id), business.business_name])
    );

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        blocked: links.map((link, index) => ({
          id: link._id,
          business_name: nameById.get(String(otherIds[index])) || "",
          blocked_at: link.updated_at,
        })),
      },
    });
  } catch (error) {
    return fail(res, STATUS_CODES.INTERNAL_SERVER_ERROR, error.message);
  }
};

export const unblock = async (req, res) => {
  try {
    const link = await Link.findOne({
      _id: req.params.id,
      status: LINK_STATUS.BLOCKED,
      blocked_by_business_id: req.user.business_id,
    });
    if (!link) {
      return fail(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.ERROR_MESSAGES.LINK_NOT_FOUND
      );
    }

    await endLink(link, LINK_STATUS.UNLINKED, {
      responded_by: req.user._id,
      blocked_by_business_id: null,
    });
    return res.status(STATUS_CODES.SUCCESS).json({ success: true, data: {} });
  } catch (error) {
    return fail(res, STATUS_CODES.INTERNAL_SERVER_ERROR, error.message);
  }
};

const findOwnLink = async (req) =>
  Link.findOne({
    _id: req.params.id,
    $or: [
      { requester_business_id: req.user.business_id },
      { target_business_id: req.user.business_id },
    ],
  });

export const unlink = async (req, res) => {
  try {
    const link = await findOwnLink(req);
    if (!link) {
      return fail(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.ERROR_MESSAGES.LINK_NOT_FOUND
      );
    }
    if (![LINK_STATUS.ACTIVE, LINK_STATUS.PENDING].includes(link.status)) {
      return fail(
        res,
        STATUS_CODES.CONFLICT,
        MESSAGES.ERROR_MESSAGES.LINK_INVALID_STATE
      );
    }

    await endLink(link, LINK_STATUS.UNLINKED, { responded_by: req.user._id });
    return res.status(STATUS_CODES.SUCCESS).json({ success: true, data: {} });
  } catch (error) {
    return fail(res, STATUS_CODES.INTERNAL_SERVER_ERROR, error.message);
  }
};

export const resync = async (req, res) => {
  try {
    const link = await findOwnLink(req);
    if (!link || link.status !== LINK_STATUS.ACTIVE) {
      return fail(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.ERROR_MESSAGES.LINK_NOT_FOUND
      );
    }

    const synced = await resyncLink(link);
    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { synced },
    });
  } catch (error) {
    return fail(res, STATUS_CODES.INTERNAL_SERVER_ERROR, error.message);
  }
};
