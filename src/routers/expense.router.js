import express from "express";
import {
  create,
  expenses,
  expense,
  summary,
  update,
  remove,
} from "../controllers/expense.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkPermissions } from "../middlewares/check-permission.js";
import { validate } from "../middlewares/validate.js";
import { createExpenseSchema } from "../validations/expense.validation.js";

const router = express.Router();

router.post("/", authenticate, validate(createExpenseSchema), checkPermissions(["expense.create"]), create);
router.get("/summary", authenticate, checkPermissions(["expenses.get"]), summary);
router.get("/", authenticate, checkPermissions(["expenses.get"]), expenses);
router.get("/:id", authenticate, checkPermissions(["expenses.get"]), expense);
router.put("/:id", authenticate, checkPermissions(["expense.update"]), update);
router.delete("/:id", authenticate, checkPermissions(["expense.delete"]), remove);

export default router;
