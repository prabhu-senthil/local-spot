
import mongoose from "mongoose";

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    address: String,

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    avgRating: {
      type: Number,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    tags: [String],

    openingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },

    images: [String],

    // Cached analytics
    crowdSummary: {
      bestHours: [Number],
      peakHours: [Number],
      lastUpdated: Date,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
  },
  { timestamps: true }
);

// GEO INDEX (IMPORTANT)
venueSchema.index({ location: "2dsphere" });

// SEARCH INDEXES (NEW: For Performance)
venueSchema.index({ name: "text", category: "text", address: "text" });
venueSchema.index({ name: 1 });

export default mongoose.model("Venue", venueSchema);