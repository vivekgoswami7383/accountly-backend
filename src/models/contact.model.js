import mongoose from "mongoose";
import { CONTACT_TYPES, STATUS } from "../helpers/constants.js";

const ContactSchema = new mongoose.Schema(
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
    image_key: { type: String, default: null },
    type: {
      type: String,
      enum: [...CONTACT_TYPES, null],
      default: null,
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

ContactSchema.index({ business_id: 1, phone: 1 }, { unique: true });

const Contact = mongoose.model("Contact", ContactSchema);

export default Contact;
