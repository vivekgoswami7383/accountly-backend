import mongoose from "mongoose";
import { BUSINESS_TYPES, STATUS } from "../helpers/constants.js";

const BusinessSchema = new mongoose.Schema(
  {
    user: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
      name: {
        type: String,
        required: false,
      },
      phone: {
        type: String,
        required: false,
      },
    },
    business_name: {
      type: String,
      trim: true,
      required: true,
    },
    business_type: {
      type: String,
      enum: [BUSINESS_TYPES.KIRANA_SHOP, BUSINESS_TYPES.PAN_SHOP],
      required: true,
    },
    address: {
      type: String,
      trim: true,
      required: true,
    },
    logo: {
      type: String,
    },
    gst_number: {
      type: String,
      trim: true,
    },
    status: {
      type: Number,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE, STATUS.DELETED],
      default: STATUS.ACTIVE,
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
      total_pending: {
        type: Number,
        default: 0,
      },
      total_transactions: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

const Business = mongoose.model("Business", BusinessSchema);

export default Business;
