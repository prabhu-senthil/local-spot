// models/CrowdAnalytics.js
import mongoose from "mongoose";

const crowdAnalyticsSchema = new mongoose.Schema(
  {
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },

    hour: {
      type: Number, // 0–23
      required: true,
    },

    dayOfWeek: {
      type: Number, // 0–6
      required: true,
    },

    totalReports: {
      type: Number,
      default: 0,
    },

    quietCount: { type: Number, default: 0 },
    moderateCount: { type: Number, default: 0 },
    busyCount: { type: Number, default: 0 },

    lastUpdated: Date,
  },
  { timestamps: true }
);

crowdAnalyticsSchema.index({ venueId: 1, hour: 1, dayOfWeek: 1 });

export default mongoose.model("CrowdAnalytics", crowdAnalyticsSchema); 