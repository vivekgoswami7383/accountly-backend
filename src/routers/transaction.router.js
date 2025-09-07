import express from "express";
import {
  create,
  transactions,
  update,
  remove,
} from "../controllers/transaction.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkPermissions } from "../middlewares/check-permission.js";

const router = express.Router();

// Create transaction
router.post("/", authenticate, checkPermissions(["addTransaction"]), create);

// Get all transactions
router.get(
  "/",
  authenticate,
  checkPermissions(["getTransactions"]),
  transactions
);

// Update transaction
router.put(
  "/:id",
  authenticate,
  checkPermissions(["updateTransaction"]),
  update
);

// Delete transaction
router.delete(
  "/:id",
  authenticate,
  checkPermissions(["deleteTransaction"]),
  remove
);

export default router;
