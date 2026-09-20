import mongoose from "mongoose";
import { NOTIFICATION_CATEGORIES } from "../helpers/notification-types.js";

const NotificationSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, required: true, trim: true },
    category: {
      type: String,
      default: NOTIFICATION_CATEGORIES.SYSTEM,
    },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    target: {
      kind: { type: String, default: "none" },
      id: { type: String, default: null },
    },
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
NotificationSchema.index({ user_id: 1, category: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, read_at: 1 });
NotificationSchema.index({ user_id: 1, dedupe_key: 1 }, { unique: true });
NotificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
