// models/ReviewVote.js
import mongoose from "mongoose";

const reviewVoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      required: true,
    },

    // "helpful" = thumbs up, "suspicious" = flag as fake
    type: {
      type: String,
      enum: ["helpful", "suspicious"],
      required: true,
    },
  },
  { timestamps: true }
);

// One vote record per (user, review) pair — prevents duplicate votes at DB level
reviewVoteSchema.index({ userId: 1, reviewId: 1 }, { unique: true });

export default mongoose.model("ReviewVote", reviewVoteSchema);