import mongoose from "mongoose";
import { STATUS } from "../helpers/constants.js";

const CustomerSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
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
    },
    balance: {
      type: Number,
      default: 0,
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

CustomerSchema.index({ business_id: 1, phone: 1 }, { unique: true });

const Customer = mongoose.model("Customer", CustomerSchema);

export default Customer;
