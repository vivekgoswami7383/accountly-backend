import mongoose from "mongoose";
import { STATUS } from "../helpers/constants.js";

const TransactionSchema = new mongoose.Schema(
  {
    business: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
      },
      business_name: {
        type: String,
        required: true,
      },
    },
    customer: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
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
    amount: { type: Number, required: true },
    transaction_type: {
      type: String,
      enum: ["sent", "received"],
      required: true,
    },
    description: { type: String },
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

const Transaction = mongoose.model("Transaction", TransactionSchema);
export default Transaction;
