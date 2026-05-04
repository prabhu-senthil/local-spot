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

    type: {
      type: String,
      enum: ["helpful", "suspicious"],
      required: true,
    },
  },
  { timestamps: true }
);
 
reviewVoteSchema.index({ userId: 1, reviewId: 1 }, { unique: true });

export default mongoose.model("ReviewVote", reviewVoteSchema);