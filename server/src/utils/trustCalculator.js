export function calculateTrustScore(reviews) {
  if (!reviews || reviews.length === 0) {
    return { score: 0, anomaliesDetected: false, message: "No reviews provided." };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  const ratings = []; 
  const maxHelpfulVotes = Math.max(...reviews.map(r => r.helpfulVotesCount || 0), 1);

  reviews.forEach(review => {
    const rating = review.rating || 3;
    ratings.push(rating); 
    let weight = review.userTrustScore !== undefined ? review.userTrustScore : 0.5; 
    if (review.userRole === "reviewer") {
      weight *= 1.2;
    } 
    const mlPenalty = (review.mlScore || 0) * 0.8;
    weight = Math.max(0.05, weight - mlPenalty); 
    const suspiciousCount = review.suspiciousVotesCount || 0;
    if (suspiciousCount > 0) {
      weight *= Math.pow(0.7, suspiciousCount);
    } 
    const helpfulVotesCount = review.helpfulVotesCount || 0;
    const helpfulFactor = 1 + (helpfulVotesCount / maxHelpfulVotes) * 0.5;
    
    weight = weight * helpfulFactor;
    
    weightedSum += rating * weight;
    totalWeight += weight;
  });

  const weightedAverage = totalWeight > 0 ? (weightedSum / totalWeight) : 0; 
  let finalScore = (weightedAverage / 5) * 100; 
  const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);

  let anomaliesDetected = false;
  let message = "Score calculated successfully.";

  if (stdDev > 1.5 && ratings.length > 3) {
    anomaliesDetected = true;
    message = "High polarization detected. Score adjusted for anomalies.";
    finalScore = finalScore * 0.9;
  } 
  finalScore = Math.min(Math.max(finalScore, 0), 100);

  return {
    score: Math.round(finalScore * 10) / 10,
    anomaliesDetected,
    message
  };
}
