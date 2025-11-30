import express from "express";
import { update } from "../controllers/user.controller.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { updateUserSchema } from "../validations/user.validations.js";

const router = express.Router();

router.patch(
  "/:id",
  authenticate,
  checkPermissions(["user.update"]),
  validate(updateUserSchema),
  update
);

export default router;
