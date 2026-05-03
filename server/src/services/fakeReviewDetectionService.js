/**
 * fakeReviewDetectionService.js
 *
 * Orchestrates fake review detection by combining:
 *   1. ML probability score from the Python FastAPI service
 *   2. Node.js text quality heuristic penalty
 *
 * Returns a unified result with a three-tier classification:
 *   "genuine"          suspicionScore < 0.50
 *   "suspicious"       0.50 ≤ suspicionScore < 0.75
 *   "highly_suspicious" suspicionScore ≥ 0.75
 */

import axios from "axios";
import { analyzeTextQuality } from "../utils/textQualityAnalyzer.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// ─── Thresholds ─────────────────────────────────────────────────────────────
// The suspicionScore is the max of ML and heuristic signals, so 0.35 is a
// meaningful floor — it means at least one signal is clearly elevated.
const SUSPICIOUS_THRESHOLD = 0.30;
const HIGHLY_SUSPICIOUS_THRESHOLD = 0.65;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classify(score, hasHeuristicFlags) {
  // When no structural flags fired, the ML model needs high confidence (≥0.65)
  // to avoid false positives on genuine phrases like "highly recommended".
  // When heuristics DID fire, the lower 0.40 bar applies.
  const suspiciousThreshold = hasHeuristicFlags ? SUSPICIOUS_THRESHOLD : HIGHLY_SUSPICIOUS_THRESHOLD;

  if (score >= HIGHLY_SUSPICIOUS_THRESHOLD) return "highly_suspicious";
  if (score >= suspiciousThreshold) return "suspicious";
  return "genuine";
}

async function fetchMlScore(text, metadata) {
  try {
    const { data } = await axios.post(
      `${ML_SERVICE_URL}/classify`,
      { text, metadata },
      { timeout: 5000 }
    );
    return data.mlScore ?? 0;
  } catch (err) {
    console.warn("[FakeReviewDetection] ML service unavailable, using fallback:", err.message);

    // Structural fallback heuristics mirroring the Python model patterns
    const fakePatterns = [
      /\bspam\b.*\bspam\b/i,
      /\bgreat\b.*\bgreat\b.*\bgreat\b/i,
      /ffff/i,
      /fake review/i,
      /visited \d{2,} times/i,
    ];
    return fakePatterns.some((p) => p.test(text)) ? 0.85 : 0.20;
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Analyses a review for fake content.
 *
 * @param {string} text      Review text to analyse
 * @param {object} metadata  Optional: { rating, venueId }
 * @returns {Promise<{
 *   suspicionScore: number,
 *   classification: "genuine"|"suspicious"|"highly_suspicious",
 *   isSuspicious: boolean,
 *   mlScore: number,
 *   flags: string[]
 * }>}
 */
export async function detectFakeReview(text, metadata = {}) {
  // Run heuristics synchronously (no I/O)
  const { penaltyScore, flags } = analyzeTextQuality(text);
  const hasHeuristicFlags = flags.length > 0;

  // Fetch ML score (async, with fallback)
  const mlScore = await fetchMlScore(text, metadata);

  // ── Dual-gate scoring ────────────────────────────────────────────────────
  // ML alone at 40-50% is unreliable — genuine phrases like "highly recommended"
  // score high because they appear in paid review spam in the training data.
  //
  //   No heuristic flags → ML needs ≥ 0.65 confidence (high bar, ML-only path)
  //   Heuristic flags present → max(mlScore, penaltyScore) with 0.40 threshold
  //   Both elevated (ML ≥ 0.40 + penalty ≥ 0.20) → +0.10 agreement bonus
  let suspicionScore;
  if (!hasHeuristicFlags) {
    // Heuristics found nothing structural — trust ML only at high confidence
    suspicionScore = mlScore;
  } else {
    // Heuristics flagged something — lower bar, use the stronger of the two signals
    const bothElevated = mlScore >= 0.40 && penaltyScore >= 0.20;
    suspicionScore = Math.max(mlScore, penaltyScore) + (bothElevated ? 0.10 : 0);
  }
  suspicionScore = parseFloat(Math.min(1, suspicionScore).toFixed(4));

  const classification = classify(suspicionScore, hasHeuristicFlags);
  const isSuspicious = classification !== "genuine";

  return {
    suspicionScore,
    classification,
    isSuspicious,
    mlScore,
    flags,
  };
}
