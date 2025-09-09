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
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    address: {
      type: String,
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
