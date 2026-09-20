import express from "express";
import {
  notifications,
  unreadCount,
  markAllRead,
  markRead,
} from "../controllers/notification.controller.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", authenticate, checkPermissions(["notifications.get"]), notifications);

router.get(
  "/unread-count",
  authenticate,
  checkPermissions(["notifications.get"]),
  unreadCount
);

router.put(
  "/read-all",
  authenticate,
  checkPermissions(["notification.update"]),
  markAllRead
);

router.put(
  "/:id/read",
  authenticate,
  checkPermissions(["notification.update"]),
  markRead
);

export default router;
