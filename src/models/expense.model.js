import mongoose from "mongoose";
import { STATUS, EXPENSE_CATEGORIES } from "../helpers/constants.js";

const ExpenseSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: Object.values(EXPENSE_CATEGORIES),
      required: true,
    },
    note: { type: String, default: "" },
    expense_date: { type: Date, required: true, default: Date.now },
    status: {
      type: Number,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE, STATUS.DELETED],
      default: STATUS.ACTIVE,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

ExpenseSchema.index({ user_id: 1, status: 1, expense_date: -1 });
ExpenseSchema.index({ business_id: 1, status: 1 });

const Expense = mongoose.model("Expense", ExpenseSchema);
export default Expense;
