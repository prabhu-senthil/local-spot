import axios from "axios";
import Review from "../models/Review.js";
import TrustScore from "../models/TrustScore.js";

const TRUST_SERVICE_URL = process.env.TRUST_SERVICE_URL || "http://localhost:5001";

export const calculateTrust = async (venueId) => {
  try {
    const reviews = await Review.find({ venueId }).lean();

    let trustScoreValue = 0;
    
    if (reviews.length > 0) {
      try {
        // Attempt to call the microservice with up to 2 retries
        let response;
        let attempts = 0;
        const maxRetries = 2;
        
        while (attempts <= maxRetries) {
          try {
            response = await axios.post(`${TRUST_SERVICE_URL}/calculate`, {
              reviews
            }, { timeout: 5000 });
            break; // Success
          } catch (err) {
            attempts++;
            if (attempts > maxRetries) throw err;
            await new Promise(res => setTimeout(res, 1000 * attempts)); // exponential backoff
          }
        }
        
        trustScoreValue = response.data.score;
        if (response.data.anomaliesDetected) {
          console.warn(`[TrustService] Anomalies detected for venue ${venueId}: ${response.data.message}`);
        }
      } catch (microserviceErr) {
        console.error(`[TrustService] Failed to reach trust-service, falling back to local calculation:`, microserviceErr.message);
        
        // Fallback logic
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        trustScoreValue = avgRating * 20; 
      }
    }

    // Upsert the TrustScore in the collection
    const updatedTrustScore = await TrustScore.findOneAndUpdate(
      { venueId },
      { score: trustScoreValue, lastCalculated: Date.now() },
      { new: true, upsert: true }
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
