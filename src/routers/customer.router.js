import express from "express";
import { create, customers } from "../controllers/customer.controller.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createCustomerSchema } from "../validations/customer.validation.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  checkPermissions(["createCustomer"]),
  validate(createCustomerSchema),
  create
);

router.get("/", authenticate, customers);

export default router;
