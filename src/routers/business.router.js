import express from "express";
import {
  create,
  businesses,
  business,
  update,
  remove,
} from "../controllers/business.controller.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { validate } from "../middlewares/validate.js";
import { createBusinessSchema } from "../validations/business.validations.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", validate(createBusinessSchema), create);

router.get(
  "/",
  authenticate,
  checkPermissions(["businesses.list"]),
  businesses
);

router.get(
  "/:id",
  authenticate,
  checkPermissions(["businesses.get"]),
  business
);

router.put("/:id", authenticate, checkPermissions(["business.update"]), update);

router.delete(
  "/:id",
  authenticate,
  checkPermissions(["business.delete"]),
  remove
);

export default router;
