import { randomUUID } from "crypto";
import { MESSAGES, STATUS, STATUS_CODES } from "../helpers/constants.js";
import { userHasAnyPermission } from "../middlewares/check-permission.js";
import { uploadToS3, getSignedUrlFor } from "../utils/s3.js";
import Customer from "../models/customer.model.js";
import Transaction from "../models/transaction.model.js";

const EXTENSION_BY_MIMETYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const FORBIDDEN = { ok: false, status: STATUS_CODES.FORBIDDEN };
const NOT_FOUND = { ok: false, status: STATUS_CODES.NOT_FOUND };

const requirePermission = async (req, permission) => {
  const { allowed } = await userHasAnyPermission(req.user, [permission]);
  return allowed;
};

const requireOwnedEntity = async (Model, filter) => {
  const doc = await Model.findOne(filter);
  return doc ? { ok: true } : NOT_FOUND;
};

const authorizeUpload = async (req, category, entityId) => {
  const { business_id, _id: userId } = req.user;

  switch (category) {
    case "logo": {
      if (String(business_id) !== String(entityId)) return FORBIDDEN;
      return (await requirePermission(req, "business.update")) ? { ok: true } : FORBIDDEN;
    }

    case "avatar": {
      if (String(userId) !== String(entityId)) return FORBIDDEN;
      return (await requirePermission(req, "user.update")) ? { ok: true } : FORBIDDEN;
    }

    case "customer": {
      if (!(await requirePermission(req, "customer.update"))) return FORBIDDEN;
      return requireOwnedEntity(Customer, { _id: entityId, business_id, status: { $ne: STATUS.DELETED } });
    }

    case "attachment": {
      if (!entityId) {
        return (await requirePermission(req, "transaction.create")) ? { ok: true, pending: true } : FORBIDDEN;
      }
      if (!(await requirePermission(req, "transaction.update"))) return FORBIDDEN;
      return requireOwnedEntity(Transaction, { _id: entityId, business_id, status: STATUS.ACTIVE });
    }

    default:
      return { ok: false, status: STATUS_CODES.BAD_REQUEST };
  }
};

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.RESPONSE_MESSAGES.INVALID_REQUEST,
      });
    }

    const { category, entity_id: entityId } = req.body;
    const allowedCategories = ["logo", "avatar", "customer", "attachment"];
    if (!allowedCategories.includes(category)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.RESPONSE_MESSAGES.INVALID_REQUEST,
      });
    }

    const authResult = await authorizeUpload(req, category, entityId);
    if (!authResult.ok) {
      const message =
        authResult.status === STATUS_CODES.NOT_FOUND
          ? MESSAGES.RESPONSE_MESSAGES.NOT_FOUND
          : MESSAGES.RESPONSE_MESSAGES.FORBIDDEN;
      return res.status(authResult.status).json({ success: false, message });
    }

    const { business_id } = req.user;
    const extension = EXTENSION_BY_MIMETYPE[req.file.mimetype] || "bin";
    const folderByCategory = {
      logo: "logo",
      avatar: "avatars",
      customer: "customers",
      attachment: "attachments",
    };
    const businessSegment = business_id || "no-business";
    const entitySegment = authResult.pending ? "pending" : entityId;
    const keyPrefix =
      category === "logo"
        ? `${businessSegment}/${folderByCategory[category]}`
        : `${businessSegment}/${folderByCategory[category]}/${entitySegment}`;
    const key = `${keyPrefix}/${randomUUID()}.${extension}`;

    await uploadToS3(req.file.buffer, key, req.file.mimetype);
    const url = await getSignedUrlFor(key);

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: { key, url },
    });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
