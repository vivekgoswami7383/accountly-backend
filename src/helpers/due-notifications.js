import { logger } from "../config/logger.config.js";
import { NOTIFICATION_TIMEZONE, STATUS } from "./constants.js";
import { NOTIFICATION_TARGETS, NOTIFICATION_TYPES } from "./notification-types.js";
import { createNotifications, notify } from "./notification.service.js";
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

const dueSpec = (contact, type) => {
  const amount = Math.abs(contact.balance);
  const receivable = contact.balance < 0;
  const who = receivable
    ? `${contact.name} owes you ${amount}`
    : `You owe ${contact.name} ${amount}`;
  const when = {
    [NOTIFICATION_TYPES.DUE_TOMORROW]: "Due tomorrow",
    [NOTIFICATION_TYPES.DUE_TODAY]: "Due today",
    [NOTIFICATION_TYPES.OVERDUE]: `Overdue since ${contact.due_date}`,
  }[type];

  return {
    businessId: contact.business_id,
    type,
    title: who,
    body: when,
    data: {
      contact_id: String(contact._id),
      contact_name: contact.name,
      amount,
      direction: receivable ? "receivable" : "payable",
      due_date: contact.due_date,
    },
    target: { kind: NOTIFICATION_TARGETS.CONTACT, id: String(contact._id) },
    dedupeKey: `${contact._id}:${contact.due_date}:${type}`,
  };
};

export const notifyDueForContact = async (contact, now = new Date()) => {
  if (!contact?.due_date || contact.balance === 0) return;
  const type = dueTypeFor(contact.due_date, todayInTimezone(now));
  if (!type) return;
  await notify(dueSpec(contact, type));
};

export const notifyDueSettled = async (contact, previousBalance) => {
  if (!contact?.due_date) return;
  const settled = { ...contact.toObject(), balance: previousBalance };
  const amount = Math.abs(previousBalance);
  await notify({
    ...dueSpec(settled, NOTIFICATION_TYPES.DUE_SETTLED),
    title: `Settled with ${contact.name}`,
    body: `${amount} cleared`,
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
    const specs = batch
      .map((contact) => ({ contact, type: dueTypeFor(contact.due_date, today) }))
      .filter(({ type }) => type)
      .map(({ contact, type }) => dueSpec(contact, type));
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
