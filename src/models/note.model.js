import mongoose from "mongoose";
import { STATUS } from "../helpers/constants.js";

const NoteSchema = new mongoose.Schema(
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
    title: { type: String, default: "" },
    content: { type: String, required: true },
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

NoteSchema.index({ user_id: 1, status: 1, updated_at: -1 });
NoteSchema.index({ business_id: 1, status: 1 });

const Note = mongoose.model("Note", NoteSchema);
export default Note;
