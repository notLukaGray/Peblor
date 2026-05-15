/**
 * Client-side scan of peblor JSON for `meta.figma.fallbackReason` (when export trace is not embedded).
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function visitElementLike(
  obj: Record<string, unknown>,
  out: { count: number; reasons: Record<string, number> }
): void {
  const t = obj["type"];
  if (typeof t !== "string" || !t.startsWith("element")) return;
  const meta = obj["meta"];
  if (!isRecord(meta)) return;
  const figma = meta["figma"];
  if (!isRecord(figma)) return;
  const fr = figma["fallbackReason"];
  if (typeof fr !== "string" || fr.length === 0) return;
  out.count += 1;
  bump(out.reasons, fr);
}

function walk(value: unknown, out: { count: number; reasons: Record<string, number> }): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, out);
    return;
  }
  if (!isRecord(value)) return;
  visitElementLike(value, out);
  for (const v of Object.values(value)) walk(v, out);
}

/** Scans a peblor document root (`definitions` tree). */
export function computeFallbackStatsFromPageDefinitions(pageRoot: Record<string, unknown>): {
  fallbackElements: number;
  topFallbackReasons: Array<{ code: string; count: number }>;
} {
  const acc = { count: 0, reasons: {} as Record<string, number> };
  const defs = pageRoot["definitions"];
  if (isRecord(defs)) {
    for (const block of Object.values(defs)) walk(block, acc);
  }
  const top = Object.entries(acc.reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([code, count]) => ({ code, count }));
  return { fallbackElements: acc.count, topFallbackReasons: top };
}
