/**
 * Committed foundation config for production builds.
 *
 * Provides CSS custom property maps for spacing, shadows, motion, breakpoints,
 * type scale, and z-index layers — derived from the same default token sources
 * that the dev workbench uses, but without importing from `/dev/*`.
 *
 * This is the canonical production source. The dev workbench overrides these
 * at runtime in development mode only.
 */
import { DEFAULT_BREAKPOINTS, breakpointsToCssVars } from "@/app/theme/pb-breakpoint-tokens";
import { breakpointTiersToCssVars } from "@pb/contracts/peblor/core/breakpoint-tiers";
import {
  DEFAULT_MOTION_FOUNDATIONS,
  motionFoundationsToCssVars,
} from "@/app/theme/pb-motion-tokens";
import {
  DEFAULT_SHADOW_SCALE,
  DEFAULT_SHADOW_SCALE_DARK,
  shadowScaleDarkToCssVars,
  shadowScaleToCssVars,
} from "@/app/theme/pb-shadow-tokens";
import {
  DEFAULT_BORDER_WIDTH_SCALE,
  DEFAULT_CONTENT_WIDTH_PRESETS,
  DEFAULT_LETTER_SPACING_SCALE,
  DEFAULT_LINE_HEIGHT_SCALE,
  borderWidthScaleToCssVars,
  contentWidthPresetsToCssVars,
  deriveSectionMarginScale,
  deriveSpacingScale,
  letterSpacingScaleToCssVars,
  lineHeightScaleToCssVars,
  sectionMarginScaleToCssVars,
  spacingScaleToCssVars,
} from "@/app/theme/pb-spacing-tokens";
import { DEFAULT_Z_INDEX_LAYERS, zIndexLayersToCssVars } from "@/app/theme/pb-z-index-layers";
import { typeScaleToCssVars } from "@/app/theme/pb-type-scale-tokens";
import { typeScaleConfig } from "@/app/fonts/type-scale";

// ---------------------------------------------------------------------------
// Committed foundation values (production defaults)
// ---------------------------------------------------------------------------

const COMMITTED_SPACING_SCALE = deriveSpacingScale(0.5);
const COMMITTED_SECTION_MARGIN_SCALE = deriveSectionMarginScale(COMMITTED_SPACING_SCALE);

/**
 * Merges multiple CSS var maps into one. Exported for dev workbench reuse.
 */
export function mergeCssVars(...maps: Array<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const map of maps) {
    Object.assign(out, map);
  }
  return out;
}

/**
 * Serializes a CSS custom property map into a `selector { ... }` block.
 * Exported for dev workbench reuse.
 */
export function serializeCssVarSelector(selector: string, vars: Record<string, string>): string {
  const lines = Object.keys(vars)
    .sort()
    .map((key) => `  ${key}: ${vars[key]};`)
    .join("\n");
  return `${selector} {\n${lines}\n}`;
}

/** Committed root CSS vars derived from token defaults (no dev workbench dependency). */
export const pbFoundationRootVars: Record<string, string> = mergeCssVars(
  spacingScaleToCssVars(COMMITTED_SPACING_SCALE),
  shadowScaleToCssVars(DEFAULT_SHADOW_SCALE),
  borderWidthScaleToCssVars(DEFAULT_BORDER_WIDTH_SCALE),
  motionFoundationsToCssVars(DEFAULT_MOTION_FOUNDATIONS),
  breakpointsToCssVars(DEFAULT_BREAKPOINTS),
  breakpointTiersToCssVars(),
  contentWidthPresetsToCssVars(DEFAULT_CONTENT_WIDTH_PRESETS),
  sectionMarginScaleToCssVars(COMMITTED_SECTION_MARGIN_SCALE),
  zIndexLayersToCssVars(DEFAULT_Z_INDEX_LAYERS),
  lineHeightScaleToCssVars(DEFAULT_LINE_HEIGHT_SCALE),
  letterSpacingScaleToCssVars(DEFAULT_LETTER_SPACING_SCALE),
  typeScaleToCssVars(typeScaleConfig)
);

export const pbFoundationDarkVars: Record<string, string> = mergeCssVars(
  shadowScaleDarkToCssVars(DEFAULT_SHADOW_SCALE_DARK)
);

export function serializePbProductionFoundationsCss(): string {
  return `${serializeCssVarSelector(":root", pbFoundationRootVars)}\n\n${serializeCssVarSelector(".dark", pbFoundationDarkVars)}`;
}
