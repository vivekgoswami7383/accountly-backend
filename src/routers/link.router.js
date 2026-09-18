import express from "express";
import {
  lookup,
  request,
  incoming,
  accept,
  decline,
  block,
  unlink,
  resync,
} from "../controllers/link.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { rateLimit } from "../middlewares/rate-limit.js";

const router = express.Router();

const canManage = [authenticate, checkPermissions(["link.manage"])];
const lookupLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 60 });
const requestLimit = rateLimit({ windowMs: 24 * 60 * 60 * 1000, max: 30 });

router.get("/lookup", ...canManage, lookupLimit, lookup);
router.get("/incoming", ...canManage, incoming);
router.post("/request", ...canManage, requestLimit, request);
router.post("/:id/accept", ...canManage, accept);
router.post("/:id/decline", ...canManage, decline);
router.post("/:id/block", ...canManage, block);
router.post("/:id/unlink", ...canManage, unlink);
router.post("/:id/resync", ...canManage, resync);

export default router;
