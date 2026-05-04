/**
 * reviewerTrustService.js
 *
 * Central service for:
 *   1. Calculating a reviewer's trust score from their review votes
 *   2. Persisting the score and triggering blocking logic
 *   3. Flagging reviews authored by blocked users
 */

import Review from "../models/Review.js";
import ReviewVote from "../models/ReviewVote.js";

// ─── Configurable thresholds ───────────────────────────────────────────────
/** Score below this triggers blocking (helpful - suspicious across all reviews) */
const BLOCK_THRESHOLD = -5;
/** Minimum total votes required before blocking can be applied */
const MIN_VOTES_TO_BLOCK = 3;

// ─── 1. Score Calculation ──────────────────────────────────────────────────

/**
 * Aggregate helpful / suspicious votes across ALL reviews authored by `reviewerId`.
 * Returns the net trust score: Σ helpfulVotes − Σ suspiciousVotes.
 *
 * @param {string|ObjectId} reviewerId
 * @returns {{ score: number, totalVotes: number, helpfulCount: number, suspiciousCount: number }}
 */
export async function calculateReviewerTrust(reviewerId) {
  const reviews = await Review.find({ userId: reviewerId }).lean();

  let helpfulCount = 0;
  let suspiciousCount = 0;

  for (const review of reviews) {
    helpfulCount += (review.helpfulVotes || []).length;
    suspiciousCount += (review.suspiciousVotes || []).length;

    // Automatic penalty for AI-flagged suspicious reviews
    if (review.suspicionClassification === "highly_suspicious") {
      suspiciousCount += 3;
    } else if (review.suspicionClassification === "suspicious") {
      suspiciousCount += 1;
    } else if (review.isSuspicious) {
      // Fallback for older reviews without classification
      suspiciousCount += 2;
    }
  }

  const score = helpfulCount - suspiciousCount;
  const totalVotes = helpfulCount + suspiciousCount;

  return { score, totalVotes, helpfulCount, suspiciousCount };
}

// ─── 2. Persist score + trigger blocking ──────────────────────────────────

/**
 * Re-calculates the trust score for a reviewer, saves it to the User document,
 * and blocks the user if the score falls below the threshold with enough votes.
 *
 * Designed to be called asynchronously (fire-and-forget with .catch).
 *
 * @param {string|ObjectId} reviewerId
 * @returns {Promise<{ trustScore: number, status: string }>}
 */
export async function applyTrustAndBlocking(reviewerId) {
  // Import lazily to avoid circular deps (controller ↔ service)
  const User = (await import("../models/User.js")).default;

  const { score, totalVotes } = await calculateReviewerTrust(reviewerId);

  // Determine new status
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
    // Flag their reviews asynchronously
    flagReviewsForBlockedUser(reviewerId).catch(console.error);
  }

  // Check role upgrade after applying trust updates
  evaluateUserRole(reviewerId).catch(console.error);

  return { trustScore: score, status: updatedUser.status };
}

// ─── 3. Review cleanup for blocked users ──────────────────────────────────

/**
 * Marks all reviews by a blocked user as suspicious.
 * Uses flagging (not deletion) to preserve data integrity.
 *
 * @param {string|ObjectId} userId
 */
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

// ─── 4. Automatic Role Evaluation ─────────────────────────────────────────

/**
 * Evaluates a user's review history and upgrades their role from 'user' to 'reviewer'
 * if they meet the strict quality thresholds.
 *
 * @param {string|ObjectId} userId
 */
export async function evaluateUserRole(userId) {
  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);

    if (!user) return;

    // We only evaluate standard users for promotion
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

    // 1. Update tracking fields on User
    await User.findByIdAndUpdate(userId, {
      genuineReviewCount: genuineCount,
      avgMlFakeProbability,
      suspiciousVoteRatio
    });

    // 2. Evaluate Promotion Criteria
    const isEligible = 
      genuineCount >= 5 &&
      avgMlFakeProbability < 0.3 &&
      suspiciousVoteRatio < 0.20;

    if (isEligible) {
      await User.findByIdAndUpdate(userId, { role: "reviewer" });
      console.log(`[TrustService] 🚀 User ${userId} promoted to REVIEWER!`);
      // Note: Frontend handles user notification on next session load/refresh
    }
  } catch (error) {
    console.error(`[TrustService] Error evaluating role for user ${userId}:`, error);
  }
}
