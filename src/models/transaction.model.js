import mongoose from "mongoose";
import { STATUS, TRANSACTION_TYPES } from "../helpers/constants.js";

const TransactionSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    contact: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    payment_mode: {
      type: String,
      enum: ["cash", "upi", "bank", "other"],
    },
    amount: { type: Number, required: true, min: 0 },
    transaction_type: {
      type: String,
      enum: [TRANSACTION_TYPES.DEBIT, TRANSACTION_TYPES.CREDIT],
      required: true,
    },
    description: { type: String, default: "" },
    attachment_key: { type: String, default: null },
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

TransactionSchema.index({ "contact._id": 1, status: 1, created_at: 1 });
TransactionSchema.index({ business_id: 1, status: 1, created_at: -1 });

const Transaction = mongoose.model("Transaction", TransactionSchema);

export default Transaction;
