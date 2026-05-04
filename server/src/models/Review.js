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
    
    mlScore: {
      type: Number,
      default: 0,
    },
    isSuspicious: {
      type: Boolean,
      default: false,
    }, 
    suspicionScore: {
      type: Number,
      default: 0,
    },
    suspicionClassification: {
      type: String,
      enum: ["genuine", "suspicious", "highly_suspicious"],
      default: "genuine",
    },
    helpfulVotes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    suspiciousVotes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);
 
reviewSchema.index({ venueId: 1, createdAt: -1 });
reviewSchema.index({ venueId: 1, visitTime: 1 });

export default mongoose.model("Review", reviewSchema);