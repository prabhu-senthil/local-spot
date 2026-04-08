// models/ReviewVote.js
import mongoose from "mongoose";

const reviewVoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review",
  },

  type: {
    type: String,
    enum: ["helpful", "notHelpful"],
  },
});

export default mongoose.model("ReviewVote", reviewVoteSchema);