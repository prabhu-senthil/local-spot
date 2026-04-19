import mongoose from "mongoose";

const trustScoreSchema = new mongoose.Schema(
  {
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
      unique: true,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    lastCalculated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("TrustScore", trustScoreSchema);