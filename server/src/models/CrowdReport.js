import mongoose from "mongoose";

const CrowdSchema = new mongoose.Schema({
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Venue",
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  status: {
    type: String,
    enum: ["busy", "quiet", "moderate"],
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Efficient per-user rate limit lookup (user-global, not venue-scoped)
CrowdSchema.index({ userId: 1, createdAt: 1 });
// Efficient venue-level analytics aggregation
CrowdSchema.index({ venueId: 1, createdAt: 1 });

export default mongoose.model("CrowdReport", CrowdSchema);
