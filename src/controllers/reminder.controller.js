import mongoose from "mongoose";
import {
  MESSAGES,
  REMINDER_STATES,
  STATUS,
  STATUS_CODES,
} from "../helpers/constants.js";
import { earlyAtFor, isValidTimezone } from "../helpers/reminder-schedule.js";
import Reminder from "../models/reminder.model.js";

const PAST_GRACE_MS = 60 * 1000;
const EDITABLE_FIELDS = ["title", "notes", "timezone", "repeat"];
const EARLY_FIELD = "early_minutes";

const respondError = (res, error) =>
  res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: error.message,
  });

const badRequest = (res, message) =>
  res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message });

const notFound = (res) =>
  res.status(STATUS_CODES.NOT_FOUND).json({
    success: false,
    message: MESSAGES.ERROR_MESSAGES.REMINDER_NOT_FOUND,
  });

const isInPast = (date) => date.getTime() < Date.now() - PAST_GRACE_MS;

const findOwn = (req) =>
  mongoose.isValidObjectId(req.params.id)
    ? Reminder.findOne({
        _id: req.params.id,
        user_id: req.user._id,
        status: STATUS.ACTIVE,
      })
    : null;

const respondReminder = (res, reminder) =>
  res.status(STATUS_CODES.SUCCESS).json({ success: true, data: { reminder } });

export const create = async (req, res) => {
  try {
    const { _id: user_id, business_id } = req.user;
    const { title, notes, timezone, repeat, early_minutes = null } = req.body;
    const remindAt = new Date(req.body.remind_at);

    if (!isValidTimezone(timezone)) {
      return badRequest(res, MESSAGES.ERROR_MESSAGES.INVALID_TIMEZONE);
    }
    if (isInPast(remindAt)) {
      return badRequest(res, MESSAGES.ERROR_MESSAGES.REMINDER_TIME_IN_PAST);
    }

    const reminder = await Reminder.create({
      business_id,
      user_id,
      title,
      notes,
      timezone,
      repeat,
      starts_at: remindAt,
      remind_at: remindAt,
      early_minutes,
      early_at: earlyAtFor(remindAt, early_minutes),
    });

    return respondReminder(res, reminder);
  } catch (error) {
    return respondError(res, error);
  }
};

export const reminders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const past = req.query.view === "past";

    const filter = {
      user_id: req.user._id,
      status: STATUS.ACTIVE,
      state: past
        ? { $in: [REMINDER_STATES.FIRED, REMINDER_STATES.DONE] }
        : REMINDER_STATES.SCHEDULED,
    };
    const sort = past
      ? { updated_at: -1, _id: -1 }
      : { remind_at: 1, _id: 1 };

    const items = await Reminder.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean();

    return res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      data: {
        reminders: items.slice(0, limit),
        has_more: items.length > limit,
      },
    });
  } catch (error) {
    return respondError(res, error);
  }
};

export const reminder = async (req, res) => {
  try {
    const doc = await findOwn(req);
    if (!doc) return notFound(res);
    return respondReminder(res, doc);
  } catch (error) {
    return respondError(res, error);
  }
};

export const update = async (req, res) => {
  try {
    const doc = await findOwn(req);
    if (!doc) return notFound(res);

    if (req.body.timezone != null && !isValidTimezone(req.body.timezone)) {
      return badRequest(res, MESSAGES.ERROR_MESSAGES.INVALID_TIMEZONE);
    }

    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] != null) doc[field] = req.body[field];
    });

    if (req.body.remind_at != null) {
      const remindAt = new Date(req.body.remind_at);
      const changed = remindAt.getTime() !== doc.remind_at.getTime();
      if (changed || doc.state !== REMINDER_STATES.SCHEDULED) {
        if (isInPast(remindAt)) {
          return badRequest(res, MESSAGES.ERROR_MESSAGES.REMINDER_TIME_IN_PAST);
        }
        doc.starts_at = remindAt;
        doc.remind_at = remindAt;
        doc.state = REMINDER_STATES.SCHEDULED;
        doc.completed_at = null;
      }
    }

    if (req.body[EARLY_FIELD] !== undefined) doc[EARLY_FIELD] = req.body[EARLY_FIELD];
    doc.early_at =
      doc.state === REMINDER_STATES.SCHEDULED
        ? earlyAtFor(doc.remind_at, doc.early_minutes)
        : null;

    await doc.save();
    return respondReminder(res, doc);
  } catch (error) {
    return respondError(res, error);
  }
};

export const remove = async (req, res) => {
  try {
    const doc = await findOwn(req);
    if (!doc) return notFound(res);

    doc.status = STATUS.DELETED;
    await doc.save();
    return res.status(STATUS_CODES.SUCCESS).json({ success: true, data: {} });
  } catch (error) {
    return respondError(res, error);
  }
};

export const done = async (req, res) => {
  try {
    const doc = await findOwn(req);
    if (!doc) return notFound(res);

    doc.state = REMINDER_STATES.DONE;
    doc.completed_at = new Date();
    doc.early_at = null;
    await doc.save();
    return respondReminder(res, doc);
  } catch (error) {
    return respondError(res, error);
  }
};

export const snooze = async (req, res) => {
  try {
    const doc = await findOwn(req);
    if (!doc) return notFound(res);

    doc.remind_at = new Date(Date.now() + req.body.minutes * 60 * 1000);
    doc.early_at = null;
    doc.state = REMINDER_STATES.SCHEDULED;
    doc.completed_at = null;
    await doc.save();
    return respondReminder(res, doc);
  } catch (error) {
    return respondError(res, error);
  }
};
