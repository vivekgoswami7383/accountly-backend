import mongoose from "mongoose";

export const LINK_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  DECLINED: "declined",
  BLOCKED: "blocked",
  UNLINKED: "unlinked",
};

const objectId = (ref, extra = {}) => ({
  type: mongoose.Schema.Types.ObjectId,
  ref,
  ...extra,
});

const LinkSchema = new mongoose.Schema(
  {
    pair_key: { type: String, required: true, unique: true },
    requester_business_id: objectId("Business", { required: true }),
    target_business_id: objectId("Business", { required: true }),
    requester_contact_id: objectId("Contact", { required: true }),
    target_contact_id: objectId("Contact", { default: null }),
    requested_by: objectId("User", { required: true }),
    responded_by: objectId("User", { default: null }),
    blocked_by_business_id: objectId("Business", { default: null }),
    status: {
      type: String,
      enum: Object.values(LINK_STATUS),
      default: LINK_STATUS.PENDING,
    },
    accepted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

LinkSchema.index({ target_business_id: 1, status: 1 });
LinkSchema.index({ requester_business_id: 1, status: 1 });

const Link = mongoose.model("Link", LinkSchema);

export default Link;
