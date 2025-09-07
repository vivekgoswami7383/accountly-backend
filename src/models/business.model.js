import mongoose from "mongoose";
import { BUSINESS_TYPES, STATUS } from "../helpers/constants.js";

const BusinessSchema = new mongoose.Schema(
  {
    user: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false, // Made optional for business creation flow
      },
      first_name: {
        type: String,
        required: false, // Made optional for business creation flow
      },
      last_name: {
        type: String,
        required: false, // Made optional for business creation flow
      },
      phone: {
        type: String,
        required: false, // Made optional for business creation flow
      },
    },
    business_name: {
      type: String,
      required: true,
    },
    business_type: {
      type: String,
      enum: [BUSINESS_TYPES.KIRANA_SHOP, BUSINESS_TYPES.PAN_SHOP],
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
    },
    gst_number: {
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

const Business = mongoose.model("Business", BusinessSchema);

export default Business;
