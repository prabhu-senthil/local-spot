import Review from "../models/Review.js";
import TrustScore from "../models/TrustScore.js";
import { calculateTrustScore } from "../utils/trustCalculator.js";

export const calculateTrust = async (venueId) => {
  try {
    const rawReviews = await Review.find({ venueId }).populate("userId", "role").lean();
    
    // Map reviews to include counts and user role for logic
    const reviews = rawReviews.map(r => ({
      ...r,
      userRole: r.userId?.role || "user",
      helpfulVotesCount: r.helpfulVotes?.length || 0,
      suspiciousVotesCount: r.suspiciousVotes?.length || 0,
    }));

    let trustScoreValue = 0;
    
    if (reviews.length > 0) {
      const result = calculateTrustScore(reviews);
      trustScoreValue = result.score;
      
      if (result.anomaliesDetected) {
        console.warn(`[TrustLocal] Anomalies detected for venue ${venueId}: ${result.message}`);
      }
    }

    // Upsert the TrustScore in the collection
    const updatedTrustScore = await TrustScore.findOneAndUpdate(
      { venueId },
      { score: trustScoreValue, lastCalculated: Date.now() },
      { returnDocument: "after", upsert: true }
    );

    return updatedTrustScore;
  } catch (err) {
    console.error("Error calculating trust score:", err);
    throw err;
  }
};

// Optional: Keep an HTTP endpoint if needed
export const getTrustScore = async (req, res) => {
  try {
    const { venueId } = req.params;
    const trustScore = await TrustScore.findOne({ venueId });
    if (!trustScore) {
      return res.json({ score: 0 });
    }
    res.json({ score: trustScore.score });
  } catch (err) {
    res.status(500).json({ message: "Error fetching trust score" });
  }
};
