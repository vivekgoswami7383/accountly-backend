import express from "express";
import {
  create,
  customers,
  update,
  remove,
  customer,
} from "../controllers/customer.controller.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createCustomerSchema } from "../validations/customer.validation.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  checkPermissions(["customer.create"]),
  validate(createCustomerSchema),
  create
);

router.get("/", authenticate, checkPermissions(["customers.get"]), customers);

router.get("/:id", authenticate, checkPermissions(["customers.get"]), customer);

router.put("/:id", authenticate, checkPermissions(["customer.update"]), update);

router.delete(
  "/:id",
  authenticate,
  checkPermissions(["customer.delete"]),
  remove
);

export default router;
