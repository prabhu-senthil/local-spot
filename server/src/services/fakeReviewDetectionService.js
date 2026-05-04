import axios from "axios";
import { analyzeTextQuality } from "../utils/textQualityAnalyzer.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const SUSPICIOUS_THRESHOLD = 0.25;
const HIGHLY_SUSPICIOUS_THRESHOLD = 0.65;

function classify(score, hasHeuristicFlags) {

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

export async function detectFakeReview(text, metadata = {}) {
  const { penaltyScore, flags } = analyzeTextQuality(text);
  const hasHeuristicFlags = flags.length > 0;
 
  const mlScore = await fetchMlScore(text, metadata);

  let suspicionScore;
  if (!hasHeuristicFlags) {
    suspicionScore = mlScore;
  } else {
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
