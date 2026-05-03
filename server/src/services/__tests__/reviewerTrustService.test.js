/**
 * reviewerTrustService.test.js
 * Unit tests for the reviewer trust score calculation and blocking logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Review model ────────────────────────────────────────────────────────
vi.mock("../../models/Review.js", () => ({
  default: {
    find: vi.fn(),
    updateMany: vi.fn(),
  },
}));

// ── Mock User model (dynamic import inside service) ──────────────────────────
vi.mock("../../models/User.js", () => ({
  default: {
    findByIdAndUpdate: vi.fn(),
  },
}));

import Review from "../../models/Review.js";
import {
  calculateReviewerTrust,
  applyTrustAndBlocking,
  flagReviewsForBlockedUser,
} from "../reviewerTrustService.js";

// Helper to build a mock review with vote arrays
function makeReview({ helpful = [], suspicious = [], isSuspicious = false } = {}) {
  return { helpfulVotes: helpful, suspiciousVotes: suspicious, isSuspicious };
}

/**
 * Helper to configure Review.find() to return data via .lean() chaining.
 * The service calls: Review.find({ userId }).lean()
 */
function mockFindReturning(data) {
  Review.find.mockReturnValue({ lean: vi.fn().mockResolvedValue(data) });
}

// ── calculateReviewerTrust tests ─────────────────────────────────────────────

describe("calculateReviewerTrust", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns zero score when reviewer has no reviews", async () => {
    mockFindReturning([]);
    const result = await calculateReviewerTrust("reviewer1");
    expect(result.score).toBe(0);
    expect(result.totalVotes).toBe(0);
    expect(result.helpfulCount).toBe(0);
    expect(result.suspiciousCount).toBe(0);
  });

  it("calculates positive trust score from helpful votes", async () => {
    mockFindReturning([
      makeReview({ helpful: ["u1", "u2", "u3"] }),
      makeReview({ helpful: ["u4"] }),
    ]);
    const result = await calculateReviewerTrust("reviewer1");
    expect(result.score).toBe(4);        // 4 helpful - 0 suspicious
    expect(result.helpfulCount).toBe(4);
    expect(result.suspiciousCount).toBe(0);
    expect(result.totalVotes).toBe(4);
  });

  it("calculates negative trust score from suspicious votes", async () => {
    mockFindReturning([
      makeReview({ helpful: ["u1"], suspicious: ["u2", "u3", "u4", "u5", "u6", "u7"] }),
    ]);
    const result = await calculateReviewerTrust("reviewer1");
    expect(result.score).toBe(-5);       // 1 helpful - 6 suspicious
    expect(result.suspiciousCount).toBe(6);
  });

  it("handles mixed votes across multiple reviews", async () => {
    mockFindReturning([
      makeReview({ helpful: ["u1", "u2"], suspicious: ["u3"] }),
      makeReview({ helpful: ["u4"], suspicious: [] }),
    ]);
    const result = await calculateReviewerTrust("reviewer1");
    expect(result.score).toBe(2);        // 3 helpful - 1 suspicious
    expect(result.totalVotes).toBe(4);
  });
});

// ── applyTrustAndBlocking tests ───────────────────────────────────────────────

describe("applyTrustAndBlocking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates trust score without blocking when score >= threshold", async () => {
    const User = (await import("../../models/User.js")).default;
    mockFindReturning([makeReview({ helpful: ["u1", "u2"] })]);
    User.findByIdAndUpdate.mockResolvedValue({ status: "active", reviewerTrustScore: 2 });

    const result = await applyTrustAndBlocking("reviewer1");
    expect(result.status).toBe("active");
    expect(result.trustScore).toBe(2);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "reviewer1",
      expect.not.objectContaining({ status: "blocked" }),
      expect.any(Object)
    );
  });

  it("blocks user when score < -5 and totalVotes >= 3", async () => {
    const User = (await import("../../models/User.js")).default;
    // Score = -6, totalVotes = 6 — meets both block conditions
    mockFindReturning([
      makeReview({ helpful: [], suspicious: ["u1", "u2", "u3", "u4", "u5", "u6"] }),
    ]);
    User.findByIdAndUpdate.mockResolvedValue({ status: "blocked", reviewerTrustScore: -6 });
    Review.updateMany.mockResolvedValue({ modifiedCount: 1 });

    const result = await applyTrustAndBlocking("reviewer1");
    expect(result.status).toBe("blocked");
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "reviewer1",
      expect.objectContaining({ status: "blocked" }),
      expect.any(Object)
    );
  });

  it("does NOT block when score < threshold but totalVotes < 3 (min votes not met)", async () => {
    const User = (await import("../../models/User.js")).default;
    // Only 2 suspicious votes — below MIN_VOTES_TO_BLOCK (3)
    mockFindReturning([makeReview({ suspicious: ["u1", "u2"] })]);
    User.findByIdAndUpdate.mockResolvedValue({ status: "active", reviewerTrustScore: -2 });

    const result = await applyTrustAndBlocking("reviewer1");
    expect(result.status).toBe("active");
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "reviewer1",
      expect.not.objectContaining({ status: "blocked" }),
      expect.any(Object)
    );
  });

  it("returns active status when user is not found in DB", async () => {
    const User = (await import("../../models/User.js")).default;
    mockFindReturning([]);
    User.findByIdAndUpdate.mockResolvedValue(null);

    const result = await applyTrustAndBlocking("nonexistent");
    expect(result.status).toBe("active");
    expect(result.trustScore).toBe(0);
  });
});

// ── flagReviewsForBlockedUser tests ──────────────────────────────────────────

describe("flagReviewsForBlockedUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks all reviews isSuspicious for a blocked user", async () => {
    Review.updateMany.mockResolvedValue({ modifiedCount: 3 });

    const result = await flagReviewsForBlockedUser("blockedUser1");
    expect(Review.updateMany).toHaveBeenCalledWith(
      { userId: "blockedUser1" },
      { $set: { isSuspicious: true } }
    );
    expect(result.modifiedCount).toBe(3);
  });
});
