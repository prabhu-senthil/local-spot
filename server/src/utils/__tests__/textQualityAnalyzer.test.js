/**
 * textQualityAnalyzer.test.js
 * Unit tests for all text quality heuristic functions.
 * No mocks needed — all functions are pure and synchronous.
 */

import { describe, it, expect } from "vitest";
import {
  detectRepeatedWords,
  detectGibberish,
  detectExcessivePunctuation,
  detectShortReview,
  analyzeTextQuality,
} from "../../utils/textQualityAnalyzer.js";

// ─── detectRepeatedWords ───────────────────────────────────────────────────

describe("detectRepeatedWords", () => {
  it("should NOT flag normal text with no repetition", () => {
    const result = detectRepeatedWords("Food was delicious and the service was great.");
    expect(result.flagged).toBe(false);
    expect(result.penalty).toBe(0);
  });

  it("should flag text with a single repeated word pair", () => {
    const result = detectRepeatedWords("SPAM SPAM buy cheap stuff");
    expect(result.flagged).toBe(true);
    expect(result.penalty).toBeGreaterThan(0);
  });

  it("should flag text with multiple distinct repeated pairs and cap penalty", () => {
    const result = detectRepeatedWords("FFFF FFFF SPAM SPAM SPAM great great great");
    expect(result.flagged).toBe(true);
    expect(result.penalty).toBeLessThanOrEqual(0.75); // penalty is capped
  });

  it("should handle empty/null text gracefully", () => {
    expect(detectRepeatedWords("").flagged).toBe(false);
    expect(detectRepeatedWords(null).flagged).toBe(false);
  });
});

// ─── detectGibberish ──────────────────────────────────────────────────────

describe("detectGibberish", () => {
  it("should NOT flag normal English words", () => {
    const result = detectGibberish("Nice restaurant with great ambience and service.");
    expect(result.flagged).toBe(false);
    expect(result.penalty).toBe(0);
  });

  it("should flag a single gibberish word (no vowels)", () => {
    const result = detectGibberish("www dsfghsgth dfhyjdey");
    expect(result.flagged).toBe(true);
    expect(result.penalty).toBeGreaterThan(0);
  });

  it("should flag multiple gibberish words and cap the penalty", () => {
    const result = detectGibberish("xyzxyz dsfghsgth qwrtyp blmprst something");
    expect(result.flagged).toBe(true);
    expect(result.penalty).toBeLessThanOrEqual(0.6); // penalty is capped
  });

  it("should NOT flag short words (≤4 chars) even if they look odd", () => {
    const result = detectGibberish("xyz abc qwz"); // all ≤4 chars, skipped
    expect(result.flagged).toBe(false);
  });
});

// ─── detectExcessivePunctuation ───────────────────────────────────────────

describe("detectExcessivePunctuation", () => {
  it("should NOT flag normal punctuation", () => {
    const result = detectExcessivePunctuation("Great food! Really enjoyed it.");
    expect(result.flagged).toBe(false);
    expect(result.penalty).toBe(0);
  });

  it("should NOT flag exactly 3 consecutive exclamations (boundary)", () => {
    const result = detectExcessivePunctuation("Wow!!!");
    expect(result.flagged).toBe(false);
  });

  it("should flag 4+ consecutive exclamations", () => {
    const result = detectExcessivePunctuation("nice!!!!!!!");
    expect(result.flagged).toBe(true);
    expect(result.penalty).toBeGreaterThan(0);
  });

  it("should flag multiple excessive punctuation clusters and cap penalty", () => {
    const result = detectExcessivePunctuation("Nice!!!!!! Really????? Amazing!!!!");
    expect(result.flagged).toBe(true);
    expect(result.penalty).toBeLessThanOrEqual(0.3);
  });
});

// ─── detectShortReview ────────────────────────────────────────────────────

describe("detectShortReview", () => {
  it("should flag text with fewer than 10 characters", () => {
    const result = detectShortReview("ok");
    expect(result.flagged).toBe(true);
    expect(result.penalty).toBe(0.1);
  });

  it("should NOT flag text with 10 or more characters", () => {
    const result = detectShortReview("Great food"); // exactly 10 chars
    expect(result.flagged).toBe(false);
    expect(result.penalty).toBe(0);
  });

  it("should flag null/empty input", () => {
    expect(detectShortReview(null).flagged).toBe(true);
    expect(detectShortReview("").flagged).toBe(true);
  });
});

// ─── analyzeTextQuality (orchestrator) ────────────────────────────────────

describe("analyzeTextQuality", () => {
  it("should return zero penalty and no flags for a clean genuine review", () => {
    const result = analyzeTextQuality(
      "The food was delicious and the atmosphere was wonderful. Highly recommend the pasta."
    );
    expect(result.penaltyScore).toBe(0);
    expect(result.flags).toHaveLength(0);
  });

  it("should accumulate penalties for multiple issues", () => {
    // Short + excessive punctuation
    const result = analyzeTextQuality("ok!!!!!!!");
    expect(result.flags).toContain("TOO_SHORT");
    expect(result.flags).toContain("EXCESSIVE_PUNCTUATION");
    expect(result.penaltyScore).toBeGreaterThan(0.1);
  });

  it("should detect repeated words as a flag", () => {
    const result = analyzeTextQuality("SPAM SPAM SPAM buy cheap watches here");
    expect(result.flags).toContain("REPEATED_WORDS");
    expect(result.penaltyScore).toBeGreaterThan(0);
  });

  it("should clamp combined penalty to a max of 1.0", () => {
    // All four checks triggered simultaneously
    const result = analyzeTextQuality("xy!!!!!!!! SPAM SPAM dsfghsgth qwrtyp");
    expect(result.penaltyScore).toBeLessThanOrEqual(1.0);
    expect(result.penaltyScore).toBeGreaterThan(0);
  });
});
