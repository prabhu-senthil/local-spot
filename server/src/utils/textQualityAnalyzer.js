export function detectRepeatedWords(text) {
  if (!text) return { penalty: 0, flagged: false, flag: "REPEATED_WORDS" };

  const repeats = text.match(/(\b\w+\b)(?:\s+\1)+/gi) || [];
  const penalty = Math.min(0.75, 0.25 * repeats.length);

  return {
    penalty,
    flagged: repeats.length > 0,
    flag: "REPEATED_WORDS",
    detail: repeats,
  };
}

export function detectGibberish(text) {
  if (!text) return { penalty: 0, flagged: false, flag: "GIBBERISH_DETECTED" };

  const vowels = new Set("aeiouAEIOU");
  const words = text.split(/\s+/).filter((w) => w.replace(/\W/g, "").length > 6);

  const gibberishWords = words.filter((raw) => {
    const w = raw.replace(/\W/g, "");
    const vowelCount = [...w].filter((c) => vowels.has(c)).length; 
    return vowelCount === 0 || w.length / vowelCount > 7;
  });

  const penalty = Math.min(0.6, 0.2 * gibberishWords.length);

  return {
    penalty,
    flagged: gibberishWords.length > 0,
    flag: "GIBBERISH_DETECTED",
    detail: gibberishWords,
  };
}

export function detectExcessivePunctuation(text) {
  if (!text) return { penalty: 0, flagged: false, flag: "EXCESSIVE_PUNCTUATION" };

  const matches = text.match(/[!?]{4,}/g) || [];
  return {
    penalty: Math.min(0.3, matches.length > 0 ? 0.1 + (matches.length - 1) * 0.05 : 0),
    flagged: matches.length > 0,
    flag: "EXCESSIVE_PUNCTUATION",
    detail: matches,
  };
}

export function detectRepetitiveCharacters(text) {
  if (!text) return { penalty: 0, flagged: false, flag: "REPETITIVE_CHARS" };

  const matches = text.match(/(\w)\1{3,}/g) || [];
  const penalty = Math.min(0.5, 0.25 * matches.length);

  return {
    penalty,
    flagged: matches.length > 0,
    flag: "REPETITIVE_CHARS",
    detail: matches,
  };
}

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
 
export function analyzeTextQuality(text) {
  const checkers = [
    detectRepeatedWords(text),
    detectGibberish(text),
    detectRepetitiveCharacters(text),
    detectExcessivePunctuation(text),
    detectShortReview(text),
  ];

  const flags = checkers.filter((c) => c.flagged).map((c) => c.flag);
  const rawPenalty = checkers.reduce((sum, c) => sum + c.penalty, 0);

  const penaltyScore = Math.min(1, Math.max(0, parseFloat(rawPenalty.toFixed(4))));

  return { penaltyScore, flags };
}
