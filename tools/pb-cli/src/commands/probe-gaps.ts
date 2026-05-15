import type { CatalogEntry } from "@pb/catalog";

export function bestGap(entry: CatalogEntry, tokens: string[]): string {
  const negatives = [
    ...entry.not_this_if.map((line) => ({ line, source: "not_this_if" as const })),
    ...entry.does_not_cover.map((item) => ({
      line: `${item.what} -> ${item.use_instead}`,
      source: "does_not_cover" as const,
    })),
  ];

  const scored = negatives
    .map((candidate) => {
      const lower = candidate.line.toLowerCase();
      const overlap = tokens.filter((token) => lower.includes(token)).length;
      return { ...candidate, overlap };
    })
    .filter((candidate) => candidate.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);

  if (scored[0]) return scored[0].line;

  const axes = entry.axes.map((axis) => axis.name).join(", ");
  return axes
    ? `Intent partially overlaps, but axis constraints differ (available axes: ${axes}).`
    : "Intent partially overlaps, but required behavior is not explicitly covered by this entry.";
}
