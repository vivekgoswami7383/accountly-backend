import mongoose from "mongoose";

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
    message: { type: String, required: true },
    link: { type: String, default: null },
    dedupe_key: { type: String, required: true },
    read_at: { type: Date, default: null },
    expires_at: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

NotificationSchema.index({ user_id: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, read_at: 1 });
NotificationSchema.index({ user_id: 1, dedupe_key: 1 }, { unique: true });
NotificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
