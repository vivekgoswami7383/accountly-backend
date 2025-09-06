import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    type: {
      type: String,
      enum: ["cash", "upi"],
      required: true,
    },
    amount: { type: Number, required: true },
    paid_amount: { type: Number, required: true },
    description: { type: String },
    due_date: { type: Date },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

const Transaction = mongoose.model("Transaction", TransactionSchema);
export default Transaction;
