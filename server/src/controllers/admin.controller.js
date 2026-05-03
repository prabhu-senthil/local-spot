/**
 * admin.controller.js
 * Admin-only endpoints for monitoring reviewer trust metrics.
 */

import User from "../models/User.js";
import Review from "../models/Review.js";

/**
 * GET /api/admin/trust-metrics
 * Returns all users with trust score data, sorted by score ascending.
 * Flagged/blocked reviewers appear first.
 */
export async function getTrustMetrics(req, res) {
  try {
    const users = await User.find(
      { role: { $in: ["user", "reviewer"] } },
      "name email role reviewerTrustScore status reviewsCount createdAt"
    )
      .sort({ reviewerTrustScore: 1 })
      .lean();

    // Fetch review counts and vote tallies for each user
    const enriched = await Promise.all(
      users.map(async (u) => {
        const reviews = await Review.find({ userId: u._id }).lean();
        const helpfulCount = reviews.reduce(
          (sum, r) => sum + (r.helpfulVotes?.length || 0),
          0
        );
        const suspiciousCount = reviews.reduce(
          (sum, r) => sum + (r.suspiciousVotes?.length || 0),
          0
        );
        const flaggedReviews = reviews.filter((r) => r.isSuspicious).length;

        return {
          ...u,
          reviewCount: reviews.length,
          helpfulVotes: helpfulCount,
          suspiciousVotes: suspiciousCount,
          flaggedReviews,
        };
      })
    );

    const blocked = enriched.filter((u) => u.status === "blocked");
    const active = enriched.filter((u) => u.status !== "blocked");

    return res.status(200).json({
      summary: {
        total: enriched.length,
        blocked: blocked.length,
        active: active.length,
      },
      blockedUsers: blocked,
      activeUsers: active,
    });
  } catch (err) {
    console.error("Error fetching trust metrics:", err);
    return res.status(500).json({ message: "Failed to fetch trust metrics." });
  }
}

/**
 * POST /api/admin/users/:userId/unblock
 * Manually unblock a reviewer and reset their trust score.
 */
export async function unblockReviewer(req, res) {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { status: "active", reviewerTrustScore: 0 },
      { new: true }
    ).select("name email status reviewerTrustScore");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: `Reviewer ${user.name} has been unblocked and trust score reset to 0.`,
      user,
    });
  } catch (err) {
    console.error("Error unblocking reviewer:", err);
    return res.status(500).json({ message: "Failed to unblock reviewer." });
  }
}
/**
 * GET /api/admin/suspicious-reviews
 * Returns all reviews flagged as suspicious or highly_suspicious,
 * sorted by suspicionScore descending. Includes reviewer name for admin context.
 *
 * Query params:
 *   ?classification=suspicious|highly_suspicious  (optional filter)
 *   ?limit=50                                      (default 50)
 */
export async function getSuspiciousReviews(req, res) {
  try {
    const { classification, limit = 50 } = req.query;

    const filter = { isSuspicious: true };
    if (classification && ["suspicious", "highly_suspicious"].includes(classification)) {
      filter.suspicionClassification = classification;
    }

    const reviews = await Review.find(filter)
      .populate("userId", "name email status reviewerTrustScore")
      .populate("venueId", "name")
      .sort({ suspicionScore: -1, createdAt: -1 })
      .limit(Number(limit))
      .lean();

    const summary = {
      total: reviews.length,
      highlySuspicious: reviews.filter((r) => r.suspicionClassification === "highly_suspicious").length,
      suspicious: reviews.filter((r) => r.suspicionClassification === "suspicious").length,
    };

    return res.status(200).json({ summary, reviews });
  } catch (err) {
    console.error("Error fetching suspicious reviews:", err);
    return res.status(500).json({ message: "Failed to fetch suspicious reviews." });
  }
}
