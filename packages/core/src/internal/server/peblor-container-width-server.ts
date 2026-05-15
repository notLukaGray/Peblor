import type { SectionBlock } from "@pb/contracts";
import { splitTopLevelCommaList } from "../../lib/shared-utils";

const BASE_REM_PX = 16;

function parsePercent(value: unknown): number | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (!m) return undefined;
  const pct = Number(m[1]) / 100;
  return Number.isFinite(pct) && pct >= 0 ? pct : undefined;
}

function parseLengthTokenPx(
  token: string,
  viewportPx: number | undefined,
  percentBasePx: number | undefined
): number | undefined {
  const s = token.trim();
  const px = s.match(/^(\d+(?:\.\d+)?)\s*px$/i);
  if (px) return Number(px[1]);

  const rem = s.match(/^(\d+(?:\.\d+)?)\s*rem$/i);
  if (rem) return Number(rem[1]) * BASE_REM_PX;

  const vw = s.match(/^(\d+(?:\.\d+)?)\s*vw$/i);
  if (vw) return viewportPx != null ? (Number(vw[1]) / 100) * viewportPx : undefined;

  const pct = parsePercent(s);
  if (pct != null) return percentBasePx != null ? pct * percentBasePx : undefined;
  return undefined;
}

function parseExpressionPx(
  value: unknown,
  viewportPx: number | undefined,
  percentBasePx: number | undefined
): number | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;

  const minMatch = s.match(/^min\((.*)\)$/i);
  if (minMatch) {
    const minExpression = minMatch[1];
    if (minExpression == null) return undefined;
    const parts = splitTopLevelCommaList(minExpression);
    if (parts.length < 2) return undefined;
    const values = parts
      .map((part) => parseExpressionPx(part, viewportPx, percentBasePx))
      .filter((part): part is number => part != null);
    if (values.length !== parts.length) return undefined;
    return Math.min(...values);
  }

  const maxMatch = s.match(/^max\((.*)\)$/i);
  if (maxMatch) {
    const maxExpression = maxMatch[1];
    if (maxExpression == null) return undefined;
    const parts = splitTopLevelCommaList(maxExpression);
    if (parts.length < 2) return undefined;
    const values = parts
      .map((part) => parseExpressionPx(part, viewportPx, percentBasePx))
      .filter((part): part is number => part != null);
    if (values.length !== parts.length) return undefined;
    return Math.max(...values);
  }

  return parseLengthTokenPx(s, viewportPx, percentBasePx);
}

export function computeContainerWidthPx(
  section: SectionBlock,
  elementId: string | undefined,
  viewportWidthPx?: number
): number | undefined {
  const viewportPx =
    typeof viewportWidthPx === "number" && Number.isFinite(viewportWidthPx) && viewportWidthPx > 0
      ? viewportWidthPx
      : undefined;
  const sectionRecord = section as Record<string, unknown>;
  const sectionWidthPx =
    parseExpressionPx(sectionRecord.width, viewportPx, viewportPx) ?? viewportPx;
  if (sectionWidthPx == null) return undefined;
  const contentWidthPx =
    parseExpressionPx(sectionRecord.contentWidth, viewportPx, sectionWidthPx) ?? sectionWidthPx;
  const contentAreaPx = Math.round(contentWidthPx);
  if (contentAreaPx <= 0) return undefined;

  const type = sectionRecord.type as string | undefined;
  if (type === "contentBlock" || type === "scrollContainer" || type === "revealSection") {
    return contentAreaPx;
  }
  if (type !== "sectionColumn") return contentAreaPx;

  const columnSpan = sectionRecord.columnSpan as Record<string, number | "all"> | undefined;
  if (elementId && columnSpan?.[elementId] === "all") return contentAreaPx;

  const columnWidths = sectionRecord.columnWidths as number[] | undefined;
  const columnAssignments = sectionRecord.columnAssignments as Record<string, number> | undefined;
  if (!Array.isArray(columnWidths) || columnWidths.length === 0) return contentAreaPx;
  const total = columnWidths.reduce((a, b) => a + b, 0);
  if (total <= 0) return contentAreaPx;

  const colIndexRaw =
    elementId != null && columnAssignments && typeof columnAssignments[elementId] === "number"
      ? columnAssignments[elementId]
      : 0;
  const colIndex = Number.isFinite(colIndexRaw) ? Math.trunc(colIndexRaw) : 0;
  const boundedIndex = Math.max(0, Math.min(colIndex, columnWidths.length - 1));
  const fraction = columnWidths[boundedIndex]! / total;
  return Math.round(contentAreaPx * fraction);
}

function buildMemoKey(
  section: SectionBlock,
  elementId: string | undefined,
  viewportWidthPx?: number
): string {
  const sectionRecord = section as Record<string, unknown>;
  const viewportPx =
    typeof viewportWidthPx === "number" && Number.isFinite(viewportWidthPx) && viewportWidthPx > 0
      ? viewportWidthPx
      : undefined;
  const parsedSectionWidthPx = parseExpressionPx(sectionRecord.width, viewportPx, viewportPx);
  const effectiveSectionWidthPx = parsedSectionWidthPx ?? viewportPx;
  const parsedContentWidthPx = parseExpressionPx(
    sectionRecord.contentWidth,
    viewportPx,
    effectiveSectionWidthPx
  );
  const effectiveContentWidthPx = parsedContentWidthPx ?? effectiveSectionWidthPx;
  const widthPx =
    effectiveSectionWidthPx != null && Number.isFinite(effectiveSectionWidthPx)
      ? Math.round(effectiveSectionWidthPx)
      : "na";
  const contentWidthPx =
    effectiveContentWidthPx != null && Number.isFinite(effectiveContentWidthPx)
      ? Math.round(effectiveContentWidthPx)
      : "na";
  const type = (sectionRecord.type as string) ?? "";
  const columnWidths = sectionRecord.columnWidths as number[] | undefined;
  const columnAssignments = sectionRecord.columnAssignments as Record<string, number> | undefined;
  const colIndexRaw =
    elementId != null && columnAssignments && typeof columnAssignments[elementId] === "number"
      ? columnAssignments[elementId]
      : 0;
  const colIndex = Number.isFinite(colIndexRaw) ? Math.trunc(colIndexRaw) : 0;
  const columnSpan = sectionRecord.columnSpan as Record<string, number | "all"> | undefined;
  const spanMode = elementId && columnSpan?.[elementId] === "all" ? "all" : "col";
  const columnWidthsStr = Array.isArray(columnWidths) ? columnWidths.join(",") : "";
  return `${viewportPx ?? "na"}:${widthPx}:${contentWidthPx}:${type}:${columnWidthsStr}:${colIndex}:${spanMode}`;
}

/**
 * Returns a memoized version of computeContainerWidthPx that caches results within a single
 * tree walk. Create one per resolvePeblorAssetsOnServer call so the map does not persist across requests.
 */
export function createMemoizedComputeContainerWidthPx(): (
  section: SectionBlock,
  elementId: string | undefined,
  viewportWidthPx?: number
) => number | undefined {
  const memo = new Map<string, number | undefined>();
  return (section, elementId, viewportWidthPx) => {
    const key = buildMemoKey(section, elementId, viewportWidthPx);
    if (memo.has(key)) return memo.get(key);
    const result = computeContainerWidthPx(section, elementId, viewportWidthPx);
    memo.set(key, result);
    return result;
  };
}
