import express from "express";
import {
  publicKey,
  subscribe,
  unsubscribe,
} from "../controllers/push.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { validate } from "../middlewares/validate.js";
import {
  subscribeSchema,
  unsubscribeSchema,
} from "../validations/push.validation.js";

const router = express.Router();

router.get(
  "/public-key",
  authenticate,
  checkPermissions(["notifications.get"]),
  publicKey
);

router.post(
  "/subscription",
  authenticate,
  checkPermissions(["notification.update"]),
  validate(subscribeSchema),
  subscribe
);

router.delete(
  "/subscription",
  authenticate,
  checkPermissions(["notification.update"]),
  validate(unsubscribeSchema),
  unsubscribe
);

export default router;
