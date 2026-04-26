// models/Review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    reviewText: String,

    crowdLevel: {
      type: String,
      enum: ["quiet", "moderate", "busy"],
      required: true,
    },

    visitTime: {
      type: Date,
      required: true,
    },

    // snapshot of trust score (for weighted ratings)
    userTrustScore: {
      type: Number,
      default: 0.5,
    },

    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],

    downvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],

    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// INDEXES
reviewSchema.index({ venueId: 1, createdAt: -1 });
reviewSchema.index({ venueId: 1, visitTime: 1 });

export default mongoose.model("Review", reviewSchema);