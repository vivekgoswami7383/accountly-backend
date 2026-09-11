import mongoose from "mongoose";

const BusinessStatsSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
    },
    business_name: {
      type: String,
    },
    you_will_get: {
      type: Number,
      default: 0,
    },
    you_will_give: {
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
