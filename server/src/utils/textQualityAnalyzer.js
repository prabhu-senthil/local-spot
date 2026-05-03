/**
 * textQualityAnalyzer.js
 *
 * Pure, synchronous JavaScript heuristics for evaluating review text quality.
 * No external dependencies — fully unit-testable in isolation.
 *
 * Penalties accumulate and are clamped to [0, 1] by the caller.
 * Each checker returns: { penalty: number, flagged: boolean, flag: string }
 */

// ─── Individual Checkers ────────────────────────────────────────────────────

/**
 * Detects consecutive repeated words (e.g. "SPAM SPAM SPAM", "FFFF FFFF").
 * Each unique repeated-word pair adds +0.15 penalty.
 */
export function detectRepeatedWords(text) {
  if (!text) return { penalty: 0, flagged: false, flag: "REPEATED_WORDS" };

  const repeats = text.match(/(\b\w+\b)(?:\s+\1)+/gi) || [];
  const penalty = Math.min(0.75, 0.25 * repeats.length); // cap at 3 hits = 0.75

  return {
    penalty,
    flagged: repeats.length > 0,
    flag: "REPEATED_WORDS",
    detail: repeats,
  };
}

/**
 * Detects gibberish / nonsense words by checking vowel-to-length ratio.
 * Words longer than 4 chars with fewer than 1 vowel per 5 characters are
 * considered gibberish (e.g. "dsfghsgth", "xyzxyz").
 * Each gibberish word adds +0.20 penalty.
 */
export function detectGibberish(text) {
  if (!text) return { penalty: 0, flagged: false, flag: "GIBBERISH_DETECTED" };

  const vowels = new Set("aeiouAEIOU");
  const words = text.split(/\s+/).filter((w) => w.replace(/\W/g, "").length > 6);

  const gibberishWords = words.filter((raw) => {
    const w = raw.replace(/\W/g, "");
    const vowelCount = [...w].filter((c) => vowels.has(c)).length;
    // Ratio > 7 means fewer than 1 vowel per 7 characters — very unlikely in English
    return vowelCount === 0 || w.length / vowelCount > 7;
  });

  const penalty = Math.min(0.6, 0.2 * gibberishWords.length); // cap at 3 hits

  return {
    penalty,
    flagged: gibberishWords.length > 0,
    flag: "GIBBERISH_DETECTED",
    detail: gibberishWords,
  };
}

/**
 * Detects excessive punctuation — more than 3 consecutive ! or ?
 * (e.g. "nice!!!!!!!" or "Really????").
 * Single occurrence adds +0.10 penalty, each extra +0.05.
 */
export function detectExcessivePunctuation(text) {
  if (!text) return { penalty: 0, flagged: false, flag: "EXCESSIVE_PUNCTUATION" };

  const matches = text.match(/[!?]{4,}/g) || [];
  const penalty = Math.min(0.3, matches.length > 0 ? 0.1 + (matches.length - 1) * 0.05 : 0);

  return {
    penalty,
    flagged: matches.length > 0,
    flag: "EXCESSIVE_PUNCTUATION",
    detail: matches,
  };
}

/**
 * Detects very short reviews (fewer than 10 meaningful characters).
 * Adds +0.10 penalty.
 */
export function detectShortReview(text) {
  if (!text) return { penalty: 0.1, flagged: true, flag: "TOO_SHORT" };

  const stripped = text.trim().replace(/\s+/g, " ");
  const flagged = stripped.length < 10;

  return {
    penalty: flagged ? 0.1 : 0,
    flagged,
    flag: "TOO_SHORT",
    detail: { length: stripped.length },
  };
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Runs all heuristic checks against the review text.
 * Returns a combined penalty score and a list of triggered flags.
 *
 * @param {string} text
 * @returns {{ penaltyScore: number, flags: string[] }}
 */
export function analyzeTextQuality(text) {
  const checkers = [
    detectRepeatedWords(text),
    detectGibberish(text),
    detectExcessivePunctuation(text),
    detectShortReview(text),
  ];

  const flags = checkers.filter((c) => c.flagged).map((c) => c.flag);
  const rawPenalty = checkers.reduce((sum, c) => sum + c.penalty, 0);

  // Clamp total penalty to [0, 1]
  const penaltyScore = Math.min(1, Math.max(0, parseFloat(rawPenalty.toFixed(4))));

  return { penaltyScore, flags };
}
