/**
 * Export parity metrics (converted / fallback / dropped).
 *
 * Definitions (honest accounting):
 * - **converted** — Element blocks present in exported JSON with no `meta.figma.fallbackReason`
 *   (recursive: nested `elementGroup.section.definitions`, reveal slots, etc.).
 * - **fallback** — Element blocks that carry `meta.figma.fallbackReason` (approximation or partial
 *   Figma mapping). Every fallback must also set `meta.figma.sourceType`; `sourceName` when known.
 * - **dropped** — Figma nodes or export targets that never became a normal/fallback element output:
 *   (1) `convertNode` returned null, (2) child conversion threw before emission, (3) user chose
 *   export target "skip", (4) responsive desktop/mobile frames excluded because the pair was
 *   incomplete (orphan artboard not exported), (5) other upstream routing exclusions recorded with
 *   explicit reason codes (never subtract drops from fallback counts).
 */

import type { ConversionContext } from "./types/figma-plugin";
import type { ExportParityState, ExportParityTally } from "./export-parity-types";

/** Stable codes for `trace.counts.parity.dropReasons` / diagnostics. */
export const EXPORT_DROP_REASON = {
  CONVERT_NODE_NULL: "convert-node-null",
  GATHER_CHILD_ERROR: "gather-child-error",
  REVEAL_SLOT_ERROR: "reveal-slot-convert-error",
  COLUMN_CHILD_ERROR: "column-child-convert-error",
  EXPORT_TARGET_SKIP: "export-target-skip",
  RESPONSIVE_ORPHAN_FRAME: "responsive-orphan-frame",
} as const;

export type ExportDropReasonCode = (typeof EXPORT_DROP_REASON)[keyof typeof EXPORT_DROP_REASON];

/** Subset of categories treated as high-risk in PB dev overlay (data loss / layout surprises). */
export const HIGH_RISK_TRACE_CATEGORIES = new Set([
  "annotations",
  "structure",
  "slots",
  "module",
  "section-reveal",
  "section-column",
  "responsive",
  "node-router",
  "fills",
  "global-background",
  "preflight",
]);

function bumpReason(map: Record<string, number>, code: string, delta = 1): void {
  map[code] = (map[code] ?? 0) + delta;
}

export function createExportParityState(): ExportParityState {
  return {
    output: { converted: 0, fallback: 0, fallbackReasons: {} },
    converter: { dropped: 0, dropReasons: {} },
    upstream: { dropped: 0, dropReasons: {} },
  };
}

export function getOrCreateExportParity(ctx: ConversionContext): ExportParityState {
  let p = ctx.exportParity;
  if (!p) {
    p = createExportParityState();
    ctx.exportParity = p;
  }
  return p;
}

export function recordConverterDrop(
  ctx: ConversionContext,
  code: ExportDropReasonCode | string,
  detail?: { nodeName?: string; nodeType?: string }
): void {
  const p = getOrCreateExportParity(ctx);
  p.converter.dropped += 1;
  const key =
    detail?.nodeType !== undefined
      ? `${code}:${detail.nodeType}`
      : detail?.nodeName !== undefined
        ? `${code}:${detail.nodeName}`
        : code;
  bumpReason(p.converter.dropReasons, key, 1);
}

export function recordUpstreamDrop(
  ctx: ConversionContext,
  code: ExportDropReasonCode | string
): void {
  const p = getOrCreateExportParity(ctx);
  recordUpstreamDropOnParity(p, code);
}

export function recordUpstreamDropOnParity(
  parity: ExportParityState,
  code: ExportDropReasonCode | string
): void {
  parity.upstream.dropped += 1;
  bumpReason(parity.upstream.dropReasons, code, 1);
}

function resetOutputTally(tally: ExportParityTally): void {
  tally.converted = 0;
  tally.fallback = 0;
  tally.fallbackReasons = {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getFigmaFallbackReason(el: Record<string, unknown>): string | undefined {
  const meta = el["meta"];
  if (!isRecord(meta)) return undefined;
  const figma = meta["figma"];
  if (!isRecord(figma)) return undefined;
  const fr = figma["fallbackReason"];
  return typeof fr === "string" && fr.length > 0 ? fr : undefined;
}

/**
 * Recursively counts element-like blocks in an exported section (or element subtree).
 */
export function accumulateParityFromSectionTree(root: unknown, tally: ExportParityTally): void {
  if (!isRecord(root)) return;

  const type = root["type"];
  const isElementLike = typeof type === "string" && type.startsWith("element");
  if (isElementLike) {
    const fr = getFigmaFallbackReason(root);
    if (fr !== undefined) {
      tally.fallback += 1;
      bumpReason(tally.fallbackReasons, fr, 1);
    } else {
      tally.converted += 1;
    }
  }

  const visitArray = (arr: unknown): void => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (isRecord(item)) accumulateParityFromSectionTree(item, tally);
    }
  };

  visitArray(root["elements"]);
  visitArray(root["collapsedElements"]);
  visitArray(root["revealedElements"]);
  visitArray(root["fields"]);

  const section = root["section"];
  if (isRecord(section)) {
    const defs = section["definitions"];
    if (isRecord(defs)) {
      for (const child of Object.values(defs)) {
        accumulateParityFromSectionTree(child, tally);
      }
    }
  }

  const slots = root["slots"];
  if (isRecord(slots)) {
    for (const slot of Object.values(slots)) {
      if (!isRecord(slot)) continue;
      const inner = slot["section"];
      if (isRecord(inner)) {
        const defs = inner["definitions"];
        if (isRecord(defs)) {
          for (const child of Object.values(defs)) {
            accumulateParityFromSectionTree(child, tally);
          }
        }
      }
    }
  }
}

function accumulateParityFromPageLike(root: unknown, tally: ExportParityTally): void {
  if (!isRecord(root)) return;

  const sectionOrder = root["sectionOrder"];
  const definitions = root["definitions"];
  if (Array.isArray(sectionOrder) && isRecord(definitions)) {
    for (const key of sectionOrder) {
      if (typeof key !== "string" || key.length === 0) continue;
      accumulateParityFromSectionTree(definitions[key], tally);
    }
    return;
  }

  const sections = root["sections"];
  if (!Array.isArray(sections)) return;
  for (const section of sections) {
    accumulateParityFromSectionTree(section, tally);
  }
}

/**
 * Recomputes output parity from final export JSON buckets.
 *
 * Notes:
 * - Includes pages, presets, modals, modules, and globals.
 * - Intentionally does not traverse page.inline `preset` bags to avoid double counting
 *   against top-level `presets`.
 */
export function accumulateParityFromExportResult(result: unknown, tally: ExportParityTally): void {
  if (!isRecord(result)) return;

  const pages = result["pages"];
  if (isRecord(pages)) {
    for (const page of Object.values(pages)) {
      accumulateParityFromPageLike(page, tally);
    }
  }

  const presets = result["presets"];
  if (isRecord(presets)) {
    for (const preset of Object.values(presets)) {
      accumulateParityFromSectionTree(preset, tally);
    }
  }

  const modals = result["modals"];
  if (isRecord(modals)) {
    for (const modal of Object.values(modals)) {
      accumulateParityFromPageLike(modal, tally);
    }
  }

  const modules = result["modules"];
  if (isRecord(modules)) {
    for (const moduleValue of Object.values(modules)) {
      accumulateParityFromSectionTree(moduleValue, tally);
    }
  }

  const globals = result["globals"];
  if (!isRecord(globals)) return;
  for (const bucketKey of ["buttons", "backgrounds", "elements"] as const) {
    const bucket = globals[bucketKey];
    if (!isRecord(bucket)) continue;
    for (const value of Object.values(bucket)) {
      accumulateParityFromSectionTree(value, tally);
    }
  }
}

export function recomputeOutputParityFromExportResult(
  parity: ExportParityState,
  result: unknown
): void {
  resetOutputTally(parity.output);
  accumulateParityFromExportResult(result, parity.output);
}

export interface ParityTraceSnapshot {
  converted: number;
  fallback: number;
  dropped: number;
  fallbackReasons: Record<string, number>;
  dropReasons: Record<string, number>;
}

export function buildParityTraceSnapshot(state: ExportParityState): ParityTraceSnapshot {
  const dropReasons: Record<string, number> = {
    ...state.converter.dropReasons,
  };
  for (const [k, v] of Object.entries(state.upstream.dropReasons)) {
    dropReasons[k] = (dropReasons[k] ?? 0) + v;
  }
  return {
    converted: state.output.converted,
    fallback: state.output.fallback,
    dropped: state.converter.dropped + state.upstream.dropped,
    fallbackReasons: { ...state.output.fallbackReasons },
    dropReasons,
  };
}

export function topReasonEntries(
  reasons: Record<string, number>,
  limit: number
): Array<{ code: string; count: number }> {
  return Object.entries(reasons)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([code, count]) => ({ code, count }));
}

export function highRiskWarningBuckets(
  categoryCounts: Record<string, number>
): Array<{ category: string; count: number }> {
  const out: Array<{ category: string; count: number }> = [];
  for (const [category, count] of Object.entries(categoryCounts)) {
    if (count <= 0) continue;
    const normalised = category.toLowerCase();
    const hit = [...HIGH_RISK_TRACE_CATEGORIES].some(
      (hr) => normalised === hr || normalised.startsWith(`${hr}:`) || normalised.includes(hr)
    );
    if (hit) out.push({ category, count });
  }
  return out.sort((a, b) => b.count - a.count);
}

/** Dev tooling / clipboard: embedded next to page JSON (optional). */
export interface FigmaExportDiagnosticsV1 {
  version: 1;
  converted: number;
  fallback: number;
  dropped: number;
  topFallbackReasons: Array<{ code: string; count: number }>;
  dropReasons: Record<string, number>;
  highRiskWarnings: Array<{ category: string; count: number }>;
}

export function buildFigmaExportDiagnostics(
  parity: ParityTraceSnapshot,
  traceCategoryCounts: Record<string, number>
): FigmaExportDiagnosticsV1 {
  return {
    version: 1,
    converted: parity.converted,
    fallback: parity.fallback,
    dropped: parity.dropped,
    topFallbackReasons: topReasonEntries(parity.fallbackReasons, 12),
    dropReasons: { ...parity.dropReasons },
    highRiskWarnings: highRiskWarningBuckets(traceCategoryCounts),
  };
}
