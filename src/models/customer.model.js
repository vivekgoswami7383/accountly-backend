import mongoose from "mongoose";
import { STATUS } from "../helpers/constants.js";

const CustomerSchema = new mongoose.Schema(
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
    name: {
      type: String,
      trim: true,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    transaction_stats: {
      total_sent: {
        type: Number,
        default: 0,
      },
      total_received: {
        type: Number,
        default: 0,
      },
      total_transactions: {
        type: Number,
        default: 0,
      },
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
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

const Customer = mongoose.model("Customer", CustomerSchema);

export default Customer;
