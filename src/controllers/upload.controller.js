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

const authorizeUpload = async (req, category, entityId) => {
  const { business_id, _id: userId } = req.user;

  if (category === "logo") {
    if (String(business_id) !== String(entityId)) {
      return { ok: false, status: STATUS_CODES.FORBIDDEN };
    }
    const { allowed } = await userHasAnyPermission(req.user, ["business.update"]);
    return allowed ? { ok: true } : { ok: false, status: STATUS_CODES.FORBIDDEN };
  }

  if (category === "avatar") {
    if (String(userId) !== String(entityId)) {
      return { ok: false, status: STATUS_CODES.FORBIDDEN };
    }
    const { allowed } = await userHasAnyPermission(req.user, ["user.update"]);
    return allowed ? { ok: true } : { ok: false, status: STATUS_CODES.FORBIDDEN };
  }

  if (category === "customer") {
    const { allowed } = await userHasAnyPermission(req.user, ["customer.update"]);
    if (!allowed) return { ok: false, status: STATUS_CODES.FORBIDDEN };

    const customer = await Customer.findOne({
      _id: entityId,
      business_id,
      status: { $ne: STATUS.DELETED },
    });
    return customer ? { ok: true } : { ok: false, status: STATUS_CODES.NOT_FOUND };
  }

  if (category === "receipt") {
    if (!entityId) {
      const { allowed } = await userHasAnyPermission(req.user, ["transaction.create"]);
      return allowed ? { ok: true, pending: true } : { ok: false, status: STATUS_CODES.FORBIDDEN };
    }

    const { allowed } = await userHasAnyPermission(req.user, ["transaction.update"]);
    if (!allowed) return { ok: false, status: STATUS_CODES.FORBIDDEN };

    const transaction = await Transaction.findOne({
      _id: entityId,
      business_id,
      status: STATUS.ACTIVE,
    });
    return transaction ? { ok: true } : { ok: false, status: STATUS_CODES.NOT_FOUND };
  }

  return { ok: false, status: STATUS_CODES.BAD_REQUEST };
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
    const allowedCategories = ["logo", "avatar", "customer", "receipt"];
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
      receipt: "receipts",
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
