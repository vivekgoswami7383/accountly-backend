import Joi from "joi";
import {
  MAX_REMINDER_NOTES_LENGTH,
  MAX_REMINDER_TITLE_LENGTH,
  REMINDER_REPEATS,
  REMINDER_SNOOZE_MINUTES,
} from "../helpers/constants.js";

const fields = {
  business: Joi.forbidden(),
  business_id: Joi.forbidden(),
  user: Joi.forbidden(),
  user_id: Joi.forbidden(),
  state: Joi.forbidden(),
  starts_at: Joi.forbidden(),
  title: Joi.string().trim().min(1).max(MAX_REMINDER_TITLE_LENGTH),
  notes: Joi.string().allow("").max(MAX_REMINDER_NOTES_LENGTH),
  remind_at: Joi.date().iso(),
  timezone: Joi.string().trim().max(64),
  repeat: Joi.string().valid(...Object.values(REMINDER_REPEATS)),
};

export const createReminderSchema = Joi.object({
  ...fields,
  title: fields.title.required(),
  remind_at: fields.remind_at.required(),
  timezone: fields.timezone.required(),
}).unknown(true);

export const updateReminderSchema = Joi.object(fields).min(1).unknown(true);

export const snoozeReminderSchema = Joi.object({
  minutes: Joi.number()
    .integer()
    .valid(...REMINDER_SNOOZE_MINUTES)
    .required(),
});
