import express from "express";
import {
  create,
  businesses,
  business,
} from "../controllers/business.controller.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { validate } from "../middlewares/validate.js";
import { createBusinessSchema } from "../validations/business.validations.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  checkPermissions(["createBusiness"]),
  validate(createBusinessSchema),
  create
);

router.get("/", authenticate, businesses);

router.get("/:id", authenticate, business);

export default router;
