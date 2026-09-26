import express from "express";
import {
  create,
  reminders,
  reminder,
  update,
  remove,
  done,
  snooze,
} from "../controllers/reminder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { validate } from "../middlewares/validate.js";
import {
  createReminderSchema,
  snoozeReminderSchema,
  updateReminderSchema,
} from "../validations/reminder.validation.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  checkPermissions(["reminder.create"]),
  validate(createReminderSchema),
  create
);

router.get("/", authenticate, checkPermissions(["reminders.get"]), reminders);

router.get("/:id", authenticate, checkPermissions(["reminders.get"]), reminder);

router.put(
  "/:id",
  authenticate,
  checkPermissions(["reminder.update"]),
  validate(updateReminderSchema),
  update
);

router.delete(
  "/:id",
  authenticate,
  checkPermissions(["reminder.delete"]),
  remove
);

router.post(
  "/:id/done",
  authenticate,
  checkPermissions(["reminder.update"]),
  done
);

router.post(
  "/:id/snooze",
  authenticate,
  checkPermissions(["reminder.update"]),
  validate(snoozeReminderSchema),
  snooze
);

export default router;
