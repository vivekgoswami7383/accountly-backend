import { logger } from "../config/logger.config.js";
import { REMINDER_REPEATS, REMINDER_STATES, STATUS } from "./constants.js";
import { NOTIFICATION_TYPES } from "./notification-types.js";
import { notify } from "./notification.service.js";
import { sendPushToUser } from "./push.service.js";
import {
  earlyAtFor,
  formatReminderClock,
  formatReminderTime,
  nextOccurrence,
} from "./reminder-schedule.js";
import Reminder from "../models/reminder.model.js";

const TICK_MS = 30 * 1000;
const BATCH_SIZE = 200;
const LATE_AFTER_MS = 10 * 60 * 1000;

const messageFor = (reminder, now) => {
  const late = now.getTime() - reminder.remind_at.getTime() > LATE_AFTER_MS;
  if (!late) return reminder.title;
  return `${reminder.title} (was due ${formatReminderTime(reminder.remind_at, reminder.timezone)})`;
};

const claim = async (reminder, now) => {
  const next =
    reminder.repeat === REMINDER_REPEATS.NONE
      ? null
      : nextOccurrence(reminder.starts_at, reminder.timezone, reminder.repeat, now);

  const set = next
    ? {
        remind_at: next,
        last_fired_at: now,
        early_at: earlyAtFor(next, reminder.early_minutes, now),
      }
    : { state: REMINDER_STATES.FIRED, last_fired_at: now, early_at: null };

  const result = await Reminder.updateOne(
    {
      _id: reminder._id,
      state: REMINDER_STATES.SCHEDULED,
      status: STATUS.ACTIVE,
      remind_at: reminder.remind_at,
    },
    { $set: set }
  );
  return result.modifiedCount === 1;
};

const fire = async (reminder, now) => {
  if (!(await claim(reminder, now))) return false;

  await deliver(reminder, {
    message: messageFor(reminder, now),
    dedupeKey: `reminder:${reminder._id}:${reminder.remind_at.toISOString()}`,
  });
  return true;
};

const deliver = async (reminder, { message, dedupeKey }) => {
  const link = `/reminder/${reminder._id}`;
  const created = await notify({
    businessId: reminder.business_id,
    userIds: [reminder.user_id],
    type: NOTIFICATION_TYPES.REMINDER,
    message,
    link,
    dedupeKey,
  });

  if (created > 0) {
    await sendPushToUser(reminder.user_id, {
      title: message,
      body: (reminder.notes || "").slice(0, 200),
      url: link,
      tag: `reminder:${reminder._id}`,
    });
  }
};

const fireEarly = async (reminder) => {
  const result = await Reminder.updateOne(
    {
      _id: reminder._id,
      state: REMINDER_STATES.SCHEDULED,
      status: STATUS.ACTIVE,
      early_at: reminder.early_at,
    },
    { $set: { early_at: null } }
  );
  if (result.modifiedCount !== 1) return false;

  const clock = formatReminderClock(reminder.remind_at, reminder.timezone);
  await deliver(reminder, {
    message: `Coming up at ${clock}: ${reminder.title}`,
    dedupeKey: `reminder-early:${reminder._id}:${reminder.remind_at.toISOString()}`,
  });
  return true;
};

const runEarlyJob = async (now) => {
  let fired = 0;

  for (;;) {
    const due = await Reminder.find({
      state: REMINDER_STATES.SCHEDULED,
      status: STATUS.ACTIVE,
      early_at: { $ne: null, $lte: now },
      remind_at: { $gt: now },
    })
      .sort({ early_at: 1 })
      .limit(BATCH_SIZE)
      .lean();

    for (const reminder of due) {
      if (await fireEarly(reminder)) fired += 1;
    }
    if (due.length < BATCH_SIZE) return fired;
  }
};

export const runReminderJob = async (now = new Date()) => {
  let fired = await runEarlyJob(now);

  for (;;) {
    const due = await Reminder.find({
      state: REMINDER_STATES.SCHEDULED,
      status: STATUS.ACTIVE,
      remind_at: { $lte: now },
    })
      .sort({ remind_at: 1 })
      .limit(BATCH_SIZE)
      .lean();

    for (const reminder of due) {
      if (await fire(reminder, now)) fired += 1;
    }
    if (due.length < BATCH_SIZE) return fired;
  }
};

export const startReminderScheduler = () => {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const fired = await runReminderJob();
      if (fired > 0) logger.info(`Reminder job fired ${fired}`);
    } catch (error) {
      logger.error(`Reminder job failed: ${error.message}`);
    } finally {
      running = false;
    }
  };

  tick();
  const timer = setInterval(tick, TICK_MS);
  timer.unref();
  return timer;
};
