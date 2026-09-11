import mongoose from "mongoose";

const BusinessStatsSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true,
    },
    receivable: {
      type: Number,
      default: 0,
    },
    payable: {
      type: Number,
      default: 0,
    },
    customer_count: {
      type: Number,
      default: 0,
    },
    total_transactions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
    collection: "business_stats",
  }
);

const BusinessStats = mongoose.model("BusinessStats", BusinessStatsSchema);

export default BusinessStats;
