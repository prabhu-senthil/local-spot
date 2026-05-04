import Review from "../models/Review.js";
import ReviewVote from "../models/ReviewVote.js";

const BLOCK_THRESHOLD = -5;
const MIN_VOTES_TO_BLOCK = 3;

export async function calculateReviewerTrust(reviewerId) {
  const reviews = await Review.find({ userId: reviewerId }).lean();

  let helpfulCount = 0;
  let suspiciousCount = 0;

  for (const review of reviews) {
    helpfulCount += (review.helpfulVotes || []).length;
    suspiciousCount += (review.suspiciousVotes || []).length;

    if (review.suspicionClassification === "highly_suspicious") {
      suspiciousCount += 3;
    } else if (review.suspicionClassification === "suspicious") {
      suspiciousCount += 1;
    } else if (review.isSuspicious) { 
      suspiciousCount += 2;
    }
  }

  const score = helpfulCount - suspiciousCount;
  const totalVotes = helpfulCount + suspiciousCount;

  return { score, totalVotes, helpfulCount, suspiciousCount };
}

 
export async function applyTrustAndBlocking(reviewerId) {
  const User = (await import("../models/User.js")).default;

  const { score, totalVotes } = await calculateReviewerTrust(reviewerId);

  const shouldBlock =
    score < BLOCK_THRESHOLD && totalVotes >= MIN_VOTES_TO_BLOCK;

  const updatePayload = {
    reviewerTrustScore: score,
    ...(shouldBlock ? { status: "blocked" } : {}),
  };

  const updatedUser = await User.findByIdAndUpdate(reviewerId, updatePayload, {
    new: true,
  });

  if (!updatedUser) {
    console.warn(`[TrustService] Reviewer ${reviewerId} not found.`);
    return { trustScore: score, status: "active" };
  }

  if (shouldBlock && updatedUser.status === "blocked") {
    console.warn(
      `[TrustService] Reviewer ${reviewerId} BLOCKED. Score: ${score}, Votes: ${totalVotes}`
    ); 
    flagReviewsForBlockedUser(reviewerId).catch(console.error);
  }
 
  evaluateUserRole(reviewerId).catch(console.error);

  return { trustScore: score, status: updatedUser.status };
}

export async function flagReviewsForBlockedUser(userId) {
  const result = await Review.updateMany(
    { userId },
    { $set: { isSuspicious: true } }
  );
  console.log(
    `[TrustService] Flagged ${result.modifiedCount} reviews for blocked user ${userId}.`
  );
  return result;
}

export async function evaluateUserRole(userId) {
  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);

    if (!user) return;

    if (user.role !== "user") return;

    const reviews = await Review.find({ userId }).lean();
    if (reviews.length === 0) return;

    let genuineCount = 0;
    let totalMlScore = 0;
    let helpfulCount = 0;
    let suspiciousCount = 0;

    for (const review of reviews) {
      if (review.suspicionClassification === "genuine" || (!review.isSuspicious && !review.suspicionClassification)) {
        genuineCount++;
      }
      totalMlScore += (review.suspicionScore || review.mlScore || 0);
      helpfulCount += (review.helpfulVotes || []).length;
      suspiciousCount += (review.suspiciousVotes || []).length;
    }

    const avgMlFakeProbability = totalMlScore / reviews.length;
    const totalVotes = helpfulCount + suspiciousCount;
    const suspiciousVoteRatio = totalVotes > 0 ? suspiciousCount / totalVotes : 0;

    
    await User.findByIdAndUpdate(userId, {
      genuineReviewCount: genuineCount,
      avgMlFakeProbability,
      suspiciousVoteRatio
    });

    
    const isEligible = 
      genuineCount >= 5 &&
      avgMlFakeProbability < 0.3 &&
      suspiciousVoteRatio < 0.20;

    if (isEligible) {
      await User.findByIdAndUpdate(userId, { role: "reviewer" });
      console.log(`[TrustService] 🚀 User ${userId} promoted to REVIEWER!`);
    }
  } catch (error) {
    console.error(`[TrustService] Error evaluating role for user ${userId}:`, error);
  }
}
