import express from "express";
import {
  create,
  customerTransactions,
  transactions,
  update,
  remove,
  transaction,
} from "../controllers/transaction.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { validate } from "../middlewares/validate.js";
import { createTransactionSchema } from "../validations/transaction.validation.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  validate(createTransactionSchema),
  checkPermissions(["transaction.create"]),
  create
);

router.get(
  "/",
  authenticate,
  checkPermissions(["transactions.get"]),
  transactions
);

router.get(
  "/:id",
  authenticate,
  checkPermissions(["transactions.get"]),
  transaction
);

router.get(
  "/customer/:customer_id",
  authenticate,
  checkPermissions(["transactions.get_customer"]),
  customerTransactions
);

router.put(
  "/:id",
  authenticate,
  checkPermissions(["transaction.update"]),
  update
);

router.delete(
  "/:id",
  authenticate,
  checkPermissions(["transaction.delete"]),
  remove
);

export default router;
