import { logger } from "../config/logger.config.js";
import { NOTIFICATION_TIMEZONE, STATUS } from "./constants.js";
import { NOTIFICATION_TYPES } from "./notification-types.js";
import { createNotifications, notify } from "./notification.service.js";
import Business from "../models/business.model.js";
import Contact from "../models/contact.model.js";

const DAY_MS = 86400000;
const JOB_BATCH_SIZE = 500;
const OVERDUE_LOOKBACK_DAYS = 7;

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

const formatMoney = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const shortDate = (dateStr) =>
  new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

const currenciesFor = async (businessIds) => {
  const businesses = await Business.find({ _id: { $in: businessIds } })
    .select("currency")
    .lean();
  return new Map(businesses.map((b) => [String(b._id), b.currency || "INR"]));
};

const leadFor = (contact, money) =>
  contact.balance < 0
    ? `${contact.name} owes you ${money}`
    : `You owe ${contact.name} ${money}`;

const dueSpec = (contact, type, currency) => {
  const money = formatMoney(Math.abs(contact.balance), currency);
  const tail = {
    [NOTIFICATION_TYPES.DUE_TOMORROW]: "Due tomorrow",
    [NOTIFICATION_TYPES.DUE_TODAY]: "Due today",
    [NOTIFICATION_TYPES.OVERDUE]: `Overdue since ${shortDate(contact.due_date)}`,
  }[type];

  return {
    businessId: contact.business_id,
    type,
    message: `${leadFor(contact, money)}. ${tail}.`,
    link: `/contact/${contact._id}`,
    dedupeKey: `${contact._id}:${contact.due_date}:${type}`,
  };
};

export const notifyDueForContact = async (contact, now = new Date()) => {
  if (!contact?.due_date || contact.balance === 0) return;
  const type = dueTypeFor(contact.due_date, todayInTimezone(now));
  if (!type) return;
  const currencies = await currenciesFor([contact.business_id]);
  await notify(dueSpec(contact, type, currencies.get(String(contact.business_id))));
};

export const notifyDueSettled = async (contact, previousBalance) => {
  if (!contact?.due_date) return;
  const currencies = await currenciesFor([contact.business_id]);
  const money = formatMoney(
    Math.abs(previousBalance),
    currencies.get(String(contact.business_id))
  );
  await notify({
    businessId: contact.business_id,
    type: NOTIFICATION_TYPES.DUE_SETTLED,
    message: `Settled with ${contact.name}. ${money} cleared.`,
    link: `/contact/${contact._id}`,
    dedupeKey: `${contact._id}:${contact.due_date}:${NOTIFICATION_TYPES.DUE_SETTLED}`,
  });
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
    const currencies = await currenciesFor([
      ...new Set(batch.map((contact) => String(contact.business_id))),
    ]);
    const specs = batch
      .map((contact) => ({ contact, type: dueTypeFor(contact.due_date, today) }))
      .filter(({ type }) => type)
      .map(({ contact, type }) =>
        dueSpec(contact, type, currencies.get(String(contact.business_id)))
      );
    created += await createNotifications(specs);
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
