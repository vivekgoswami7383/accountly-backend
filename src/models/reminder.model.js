import mongoose from "mongoose";
import {
  REMINDER_REPEATS,
  REMINDER_STATES,
  STATUS,
} from "../helpers/constants.js";

const ReminderSchema = new mongoose.Schema(
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
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    starts_at: { type: Date, required: true },
    remind_at: { type: Date, required: true },
    timezone: { type: String, required: true },
    repeat: {
      type: String,
      enum: Object.values(REMINDER_REPEATS),
      default: REMINDER_REPEATS.NONE,
    },
    state: {
      type: String,
      enum: Object.values(REMINDER_STATES),
      default: REMINDER_STATES.SCHEDULED,
    },
    last_fired_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
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

ReminderSchema.index({ state: 1, status: 1, remind_at: 1 });
ReminderSchema.index({ user_id: 1, status: 1, remind_at: 1 });

const Reminder = mongoose.model("Reminder", ReminderSchema);

export default Reminder;
