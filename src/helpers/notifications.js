import mongoose from "mongoose";
import { logger } from "../config/logger.config.js";
import {
  NOTIFICATION_TIMEZONE,
  NOTIFICATION_TTL_DAYS,
  NOTIFICATION_TYPES,
  OVERDUE_LOOKBACK_DAYS,
  STATUS,
} from "./constants.js";
import Contact from "../models/contact.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

const DAY_MS = 86400000;
const JOB_BATCH_SIZE = 500;

export const todayInTimezone = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: NOTIFICATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export const shiftDate = (dateStr, days) =>
  new Date(new Date(`${dateStr}T00:00:00Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

export const dueTypeFor = (dueDate, today) => {
  if (dueDate === shiftDate(today, 1)) return NOTIFICATION_TYPES.DUE_TOMORROW;
  if (dueDate === today) return NOTIFICATION_TYPES.DUE_TODAY;
  if (dueDate < today && dueDate >= shiftDate(today, -OVERDUE_LOOKBACK_DAYS)) {
    return NOTIFICATION_TYPES.OVERDUE;
  }
  return null;
};

const buildDoc = ({ userId, businessId, type, data, dedupeKey }) => ({
  user_id: userId,
  business_id: businessId,
  type,
  data,
  dedupe_key: dedupeKey,
  read_at: null,
  expires_at: new Date(Date.now() + NOTIFICATION_TTL_DAYS * DAY_MS),
  created_at: new Date(),
});

const contactData = (contact, amount) => ({
  contact_id: String(contact._id),
  contact_name: contact.name,
  amount,
  direction: contact.balance < 0 ? "receivable" : "payable",
  due_date: contact.due_date,
});

const usersByBusiness = async (businessIds) => {
  const users = await User.find({
    business_id: { $in: businessIds },
    status: STATUS.ACTIVE,
  })
    .select("_id business_id")
    .lean();
  const map = new Map();
  users.forEach((user) => {
    const key = String(user.business_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(user._id);
  });
  return map;
};

const insertOnce = async (docs) => {
  if (docs.length === 0) return 0;
  const result = await Notification.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { user_id: doc.user_id, dedupe_key: doc.dedupe_key },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  return result.upsertedCount;
};

const dueDocsFor = (contact, type, users) =>
  users.map((userId) =>
    buildDoc({
      userId,
      businessId: contact.business_id,
      type,
      data: contactData(contact, Math.abs(contact.balance)),
      dedupeKey: `${contact._id}:${contact.due_date}:${type}`,
    })
  );

export const notifyDueForContact = async (contact, now = new Date()) => {
  try {
    if (!contact?.due_date || contact.balance === 0) return;
    const type = dueTypeFor(contact.due_date, todayInTimezone(now));
    if (!type) return;
    const users = (await usersByBusiness([contact.business_id])).get(
      String(contact.business_id)
    );
    if (!users) return;
    await insertOnce(dueDocsFor(contact, type, users));
  } catch (error) {
    logger.error(`notifyDueForContact failed: ${error.message}`);
  }
};

export const notifyDueSettled = async (contact, previousBalance) => {
  try {
    if (!contact?.due_date) return;
    const users = (await usersByBusiness([contact.business_id])).get(
      String(contact.business_id)
    );
    if (!users) return;
    const docs = users.map((userId) =>
      buildDoc({
        userId,
        businessId: contact.business_id,
        type: NOTIFICATION_TYPES.DUE_SETTLED,
        data: {
          ...contactData({ ...contact.toObject(), balance: previousBalance }, Math.abs(previousBalance)),
        },
        dedupeKey: `${contact._id}:${contact.due_date}:${NOTIFICATION_TYPES.DUE_SETTLED}`,
      })
    );
    await insertOnce(docs);
  } catch (error) {
    logger.error(`notifyDueSettled failed: ${error.message}`);
  }
};

export const runDueNotificationJob = async (now = new Date()) => {
  const today = todayInTimezone(now);
  const cursor = Contact.find({
    status: STATUS.ACTIVE,
    balance: { $ne: 0 },
    due_date: { $gte: shiftDate(today, -OVERDUE_LOOKBACK_DAYS), $lte: shiftDate(today, 1) },
  })
    .select("business_id name balance due_date")
    .lean()
    .cursor();

  let created = 0;
  let batch = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const users = await usersByBusiness([...new Set(batch.map((c) => String(c.business_id)))].map((id) => new mongoose.Types.ObjectId(id)));
    const docs = [];
    batch.forEach((contact) => {
      const type = dueTypeFor(contact.due_date, today);
      const recipients = users.get(String(contact.business_id));
      if (type && recipients) docs.push(...dueDocsFor(contact, type, recipients));
    });
    created += await insertOnce(docs);
    batch = [];
  };

  for await (const contact of cursor) {
    batch.push(contact);
    if (batch.length >= JOB_BATCH_SIZE) await flush();
  }
  await flush();
  return created;
};

export const startNotificationScheduler = () => {
  let lastRunDate = null;

  const tick = async () => {
    const today = todayInTimezone();
    if (lastRunDate === today) return;
    try {
      const created = await runDueNotificationJob();
      lastRunDate = today;
      logger.info(`Due notification job ran for ${today}, created ${created}`);
    } catch (error) {
      logger.error(`Due notification job failed: ${error.message}`);
    }
  };

  tick();
  const timer = setInterval(tick, 10 * 60 * 1000);
  timer.unref();
  return timer;
};
