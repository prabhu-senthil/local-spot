// trust-service/src/calculate.js

export function calculateTrustScore(reviews) {
  if (!reviews || reviews.length === 0) {
    return { score: 0, anomaliesDetected: false, message: "No reviews provided." };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  const ratings = [];

  // Define how much influence helpfulVotes has
  const maxHelpfulVotes = Math.max(...reviews.map(r => r.helpfulVotes || 0), 1);

  reviews.forEach(review => {
    const rating = review.rating || 3;
    ratings.push(rating);

    // userTrustScore is between 0 and 1
    const userTrust = review.userTrustScore !== undefined ? review.userTrustScore : 0.5;
    
    // Normalize helpful votes influence
    const helpfulFactor = 1 + ((review.helpfulVotes || 0) / maxHelpfulVotes) * 0.5;

    // The weight of this review
    const weight = userTrust * helpfulFactor;
    
    weightedSum += rating * weight;
    totalWeight += weight;
  });

  const weightedAverage = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
  
  // Base scale from 0 to 100 based on the 1-5 rating
  let finalScore = (weightedAverage / 5) * 100;

  // Anomaly Detection: Standard deviation check
  // If std dev is very high, reviews are highly polarized.
  const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);

  let anomaliesDetected = false;
  let message = "Score calculated successfully.";

  // Threshold for anomaly: stdDev > 1.5 implies very scattered ratings (e.g., lots of 1s and 5s)
  if (stdDev > 1.5 && ratings.length > 3) {
    anomaliesDetected = true;
    message = "High polarization detected. Score adjusted for anomalies.";
    // Slight penalty or damping effect for highly polarized venues
    finalScore = finalScore * 0.9;
  }

  // Cap at 100
  finalScore = Math.min(Math.max(finalScore, 0), 100);

  return {
    score: Math.round(finalScore * 10) / 10,
    anomaliesDetected,
    message
  };
}

export const calculateHandler = (req, res) => {
  const { reviews } = req.body;

  if (!Array.isArray(reviews)) {
    return res.status(400).json({
      error: "Invalid payload. 'reviews' must be an array."
    });
  }

  const result = calculateTrustScore(reviews);
  
  return res.status(200).json(result);
};
