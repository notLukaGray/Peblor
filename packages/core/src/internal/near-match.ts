/**
 * Levenshtein-based nearest-match utility for "did you mean?" suggestions.
 * Used in element-type and preset-key error messages (E-7).
 */

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

/**
 * Return the closest candidate string to `input` within `threshold` edits,
 * or `undefined` if nothing is close enough.
 */
export function nearestMatch(
  input: string,
  candidates: readonly string[],
  threshold = 3
): string | undefined {
  let best: string | undefined;
  let bestDist = threshold + 1;
  for (const c of candidates) {
    const d = levenshtein(input.toLowerCase(), c.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
