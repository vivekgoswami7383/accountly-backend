import mongoose from "mongoose";
import { logger } from "../config/logger.config.js";
import { STATUS } from "./constants.js";
import {
  DEFAULT_NOTIFICATION_TTL_DAYS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TARGETS,
  NOTIFICATION_TYPE_CONFIG,
} from "./notification-types.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

const DAY_MS = 86400000;

const recipientsByBusiness = async (specs) => {
  const businessIds = [
    ...new Set(
      specs.filter((spec) => !spec.userIds).map((spec) => String(spec.businessId))
    ),
  ];
  if (businessIds.length === 0) return new Map();

  const users = await User.find({
    business_id: {
      $in: businessIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
    status: STATUS.ACTIVE,
  })
    .select("_id business_id role")
    .lean();

  const map = new Map();
  users.forEach((user) => {
    const key = String(user.business_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(user);
  });
  return map;
};

const audienceFor = (spec, byBusiness) => {
  if (spec.userIds) return spec.userIds;
  const users = byBusiness.get(String(spec.businessId)) || [];
  return users
    .filter((user) => !spec.roles || spec.roles.includes(user.role))
    .filter((user) => !spec.actorId || String(user._id) !== String(spec.actorId))
    .map((user) => user._id);
};

const buildDocuments = (spec, userIds) => {
  const config = NOTIFICATION_TYPE_CONFIG[spec.type] || {};
  const ttlDays = spec.ttlDays || config.ttlDays || DEFAULT_NOTIFICATION_TTL_DAYS;
  const target = spec.target || { kind: NOTIFICATION_TARGETS.NONE, id: null };

  return userIds.map((userId) => ({
    user_id: userId,
    business_id: spec.businessId,
    type: spec.type,
    category: spec.category || config.category || NOTIFICATION_CATEGORIES.SYSTEM,
    title: spec.title || "",
    body: spec.body || "",
    data: spec.data || {},
    target,
    dedupe_key:
      spec.dedupeKey || new mongoose.Types.ObjectId().toString(),
    read_at: null,
    expires_at: new Date(Date.now() + ttlDays * DAY_MS),
    created_at: new Date(),
  }));
};

const isDuplicateKeyError = (error) =>
  error?.code === 11000 ||
  (Array.isArray(error?.writeErrors) &&
    error.writeErrors.every((item) => item.code === 11000));

const insertNew = async (docs) => {
  if (docs.length === 0) return 0;

  const existing = await Notification.collection
    .find(
      {
        user_id: { $in: [...new Set(docs.map((doc) => doc.user_id))] },
        dedupe_key: { $in: docs.map((doc) => doc.dedupe_key) },
      },
      { projection: { user_id: 1, dedupe_key: 1 } }
    )
    .toArray();
  const seen = new Set(
    existing.map((doc) => `${doc.user_id}:${doc.dedupe_key}`)
  );
  const fresh = docs.filter(
    (doc) => !seen.has(`${doc.user_id}:${doc.dedupe_key}`)
  );
  if (fresh.length === 0) return 0;

  try {
    const result = await Notification.collection.insertMany(fresh, {
      ordered: false,
    });
    return result.insertedCount;
  } catch (error) {
    if (isDuplicateKeyError(error)) return error.result?.insertedCount || 0;
    throw error;
  }
};

export const createNotifications = async (specs) => {
  if (specs.length === 0) return 0;
  const byBusiness = await recipientsByBusiness(specs);
  const docs = specs.flatMap((spec) =>
    buildDocuments(spec, audienceFor(spec, byBusiness))
  );
  return insertNew(docs);
};

export const notify = async (spec) => {
  try {
    return await createNotifications([spec]);
  } catch (error) {
    logger.error(`notify ${spec?.type} failed: ${error.message}`);
    return 0;
  }
};
