import { describe, it, expect } from "vitest";
import { calculateTrustScore } from "../src/calculate.js";

describe("Trust Score Calculator", () => {
  it("should return 0 for empty reviews", () => {
    const result = calculateTrustScore([]);
    expect(result.score).toBe(0);
    expect(result.anomaliesDetected).toBe(false);
  });

  it("should calculate simple 5-star weighted score", () => {
    const reviews = [
      { rating: 5, userTrustScore: 1, helpfulVotes: 0 },
      { rating: 5, userTrustScore: 1, helpfulVotes: 0 }
    ];
    const result = calculateTrustScore(reviews);
    expect(result.score).toBe(100);
    expect(result.anomaliesDetected).toBe(false);
  });

  it("should calculate a weighted score based on userTrustScore", () => {
    const reviews = [
      { rating: 5, userTrustScore: 1.0, helpfulVotes: 0 }, // Very trustworthy
      { rating: 1, userTrustScore: 0.1, helpfulVotes: 0 }  // Not trustworthy
    ];
    // Since the 5-star review has 10x the weight, the score should be heavily skewed towards 100
    const result = calculateTrustScore(reviews);
    expect(result.score).toBeGreaterThan(50);
  });

  it("should detect anomalies for highly polarized reviews", () => {
    const reviews = [
      { rating: 5, userTrustScore: 1, helpfulVotes: 0 },
      { rating: 5, userTrustScore: 1, helpfulVotes: 0 },
      { rating: 1, userTrustScore: 1, helpfulVotes: 0 },
      { rating: 1, userTrustScore: 1, helpfulVotes: 0 }
    ];
    const result = calculateTrustScore(reviews);
    expect(result.anomaliesDetected).toBe(true);
    // Score should be penalized by 0.9
    // Mean is 3, Base Score is (3/5)*100 = 60, Penalty = 60 * 0.9 = 54
    expect(result.score).toBe(54);
  });
});
