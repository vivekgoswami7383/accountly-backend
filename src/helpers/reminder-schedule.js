import { DateTime, IANAZone } from "luxon";
import { REMINDER_REPEATS } from "./constants.js";

const STEP_UNITS = {
  [REMINDER_REPEATS.DAILY]: "days",
  [REMINDER_REPEATS.WEEKLY]: "weeks",
  [REMINDER_REPEATS.MONTHLY]: "months",
};

export const isValidTimezone = (timezone) =>
  typeof timezone === "string" && IANAZone.isValidZone(timezone);

export const nextOccurrence = (startsAt, timezone, repeat, after) => {
  const unit = STEP_UNITS[repeat];
  if (!unit) return null;

  const anchor = DateTime.fromJSDate(startsAt, { zone: timezone });
  const limit = DateTime.fromJSDate(after, { zone: timezone });
  const at = (n) => anchor.plus({ [unit]: n });

  let n = Math.max(1, Math.floor(limit.diff(anchor, unit).get(unit)));
  while (n > 1 && at(n - 1) > limit) n -= 1;
  while (at(n) <= limit) n += 1;
  return at(n).toJSDate();
};

export const formatReminderTime = (date, timezone) =>
  DateTime.fromJSDate(date, { zone: timezone }).toFormat("d LLL, h:mm a");
