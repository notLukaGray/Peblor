import type { ExtractedGlassEffect } from "./effects";
import {
  extractBackdropFilter,
  extractBoxShadow,
  extractFilter,
  extractGlassEffect,
  withLiquidGlassDefaults,
} from "./effects";
import { getInspectableCssAsync } from "./node-css";

function readCssValue(css: Record<string, string> | undefined, keys: string[]): string | undefined {
  if (!css) return undefined;
  for (const key of keys) {
    const value = css[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "none") continue;
    return trimmed;
  }
  return undefined;
}

function extractBlurRadius(filterValue: string | undefined): string | undefined {
  if (!filterValue) return undefined;
  const match = /blur\(([^)]+)\)/i.exec(filterValue);
  if (!match || !match[1]) return undefined;
  const raw = match[1].trim();
  if (!raw) return undefined;
  if (/^[0-9.]+px$/i.test(raw)) return raw;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return undefined;
  return `${numeric}px`;
}

function hasNameGlassHint(node: SceneNode): boolean {
  const name = (node.name ?? "").trim().toLowerCase();
  if (!name) return false;
  return /\b(glass|frost|frosted|liquid)\b/.test(name);
}

function hasCssGlassHint(css: Record<string, string> | undefined): boolean {
  if (!css) return false;
  for (const [key, value] of Object.entries(css)) {
    const k = key.toLowerCase();
    const v = String(value ?? "").toLowerCase();
    if (k.includes("glass") || k.includes("liquid")) return true;
    if (v.includes("glass") || v.includes("liquid")) return true;
  }
  return false;
}

function shouldSynthesizeGlassFromBackdrop(
  node: SceneNode,
  css: Record<string, string> | undefined,
  backdropFilter: string | undefined
): boolean {
  if (!backdropFilter) return false;
  if (!/blur\(/i.test(backdropFilter)) return false;
  return hasNameGlassHint(node) || hasCssGlassHint(css);
}

export type ExtractedNodeVisualEffects = {
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  glassEffect?: ExtractedGlassEffect;
};

/**
 * Extract visual effects from a node using:
 * 1) Native Figma effect payloads.
 * 2) Inspect CSS fallbacks (for newer effect encodings and dev-mode parity).
 */
export async function extractNodeVisualEffects(
  node: SceneNode,
  precomputedCss?: Record<string, string>
): Promise<ExtractedNodeVisualEffects> {
  const effects =
    "effects" in node &&
    Array.isArray((node as SceneNode & { effects?: readonly Effect[] }).effects)
      ? ((node as SceneNode & { effects?: readonly Effect[] }).effects ?? [])
      : [];
  const inspectCss = precomputedCss ?? (await getInspectableCssAsync(node));

  const boxShadow =
    extractBoxShadow(effects) ?? readCssValue(inspectCss, ["box-shadow", "boxShadow"]);
  const filter = extractFilter(effects) ?? readCssValue(inspectCss, ["filter"]);
  const backdropFilter =
    extractBackdropFilter(effects) ??
    readCssValue(inspectCss, ["backdrop-filter", "backdropFilter", "-webkit-backdrop-filter"]);

  let glassEffect = extractGlassEffect(effects, node);
  if (!glassEffect && shouldSynthesizeGlassFromBackdrop(node, inspectCss, backdropFilter)) {
    glassEffect = withLiquidGlassDefaults({
      ...(extractBlurRadius(backdropFilter) ? { frost: extractBlurRadius(backdropFilter) } : {}),
    });
  }

  return {
    ...(boxShadow ? { boxShadow } : {}),
    ...(filter ? { filter } : {}),
    ...(backdropFilter ? { backdropFilter } : {}),
    ...(glassEffect ? { glassEffect } : {}),
  };
}
