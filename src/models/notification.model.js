import mongoose from "mongoose";
import { NOTIFICATION_TYPES } from "../helpers/constants.js";

const NotificationSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    dedupe_key: { type: String, required: true },
    read_at: { type: Date, default: null },
    expires_at: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  }
);

NotificationSchema.index({ user_id: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, read_at: 1 });
NotificationSchema.index({ user_id: 1, dedupe_key: 1 }, { unique: true });
NotificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
