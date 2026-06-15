/**
 * Seed → proposed peblor style guidelines (dev `/dev/style` + future tooling).
 * Mirrors the color tool: **seeds** drive unlocked rows; **locks** pin values.
 */
import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines";
import { DEFAULT_PB_BUILDER_FOUNDATIONS } from "@/app/theme/pb-builder-defaults";
import {
  deriveSpacingScale as deriveSpacingScaleFromBase,
  parseRemFloat,
  type SpacingScale,
} from "@/app/theme/pb-spacing-tokens";

export type StyleAlignmentSeed = "start" | "center" | "end";
type SpacingScaleStep = Exclude<keyof SpacingScale, "none">;
const SPACING_SCALE_STEPS: SpacingScaleStep[] = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
const DEFAULT_SPACING_SCALE = deriveSpacingScaleFromBase(
  DEFAULT_PB_BUILDER_FOUNDATIONS.spacingBaseRem
);

export type StyleToolSeeds = {
  /** Drives `copyTextAlign` and `frameAlignItemsDefault` until those rows are locked. */
  alignment: StyleAlignmentSeed;
  /**
   * Base rhythm in rem (paragraph gap, list Y, button pad Y, etc.). Derived headings/gaps use
   * multiples so one dial updates the whole rhythm.
   */
  spacingBaseRem: number;
  /**
   * Optional per-step overrides for spacing. Values only apply where corresponding lock is true.
   */
  spacingScale?: Record<SpacingScaleStep, string>;
  spacingScaleLocks?: Partial<Record<SpacingScaleStep, boolean>>;
  /** Base radius in rem for frame/button/code defaults. */
  radiusBaseRem: number;
  /** When true, `frameGapWhenUnset` is `2 × spacingBaseRem rem`; when false, `null`. */
  useDefaultFrameGap: boolean;
};

export const DEFAULT_STYLE_TOOL_SEEDS: StyleToolSeeds = {
  alignment: DEFAULT_PB_BUILDER_FOUNDATIONS.alignment,
  spacingBaseRem: DEFAULT_PB_BUILDER_FOUNDATIONS.spacingBaseRem,
  spacingScale: {
    xs: DEFAULT_SPACING_SCALE.xs,
    sm: DEFAULT_SPACING_SCALE.sm,
    md: DEFAULT_SPACING_SCALE.md,
    lg: DEFAULT_SPACING_SCALE.lg,
    xl: DEFAULT_SPACING_SCALE.xl,
    "2xl": DEFAULT_SPACING_SCALE["2xl"],
    "3xl": DEFAULT_SPACING_SCALE["3xl"],
    "4xl": DEFAULT_SPACING_SCALE["4xl"],
  },
  spacingScaleLocks: {},
  radiusBaseRem: DEFAULT_PB_BUILDER_FOUNDATIONS.radiusBaseRem,
  useDefaultFrameGap: true,
};

function rem(n: number): string {
  return `${n}rem`;
}

export function deriveSpacingScale(baseRem: number): SpacingScale {
  return deriveSpacingScaleFromBase(baseRem);
}

export function resolveSpacingScaleFromSeeds(seeds: StyleToolSeeds): SpacingScale {
  const baseRem = Math.max(0.125, seeds.spacingBaseRem);
  const derived = deriveSpacingScale(baseRem);
  const overrides: Partial<Record<SpacingScaleStep, string>> = seeds.spacingScale ?? {};
  const locks: Partial<Record<SpacingScaleStep, boolean>> = seeds.spacingScaleLocks ?? {};
  for (const key of SPACING_SCALE_STEPS) {
    const override = overrides[key];
    if (!locks[key] || typeof override !== "string" || override.trim().length === 0) continue;
    derived[key] = override.trim();
  }
  return derived;
}

/** Full proposal from seeds (no locks). */
export function proposePbContentGuidelines(seeds: StyleToolSeeds): PbContentGuidelines {
  const spacingScale = resolveSpacingScaleFromSeeds(seeds);
  const baseRem = Math.max(0.125, seeds.spacingBaseRem);
  const b = Math.max(0.125, parseRemFloat(spacingScale.md, baseRem));
  const r = Math.max(0.25, seeds.radiusBaseRem);
  const copyTextAlign: PbContentGuidelines["copyTextAlign"] =
    seeds.alignment === "center" ? "center" : seeds.alignment === "end" ? "right" : "start";
  const frameAlignItemsDefault: PbContentGuidelines["frameAlignItemsDefault"] =
    seeds.alignment === "center" ? "center" : seeds.alignment === "end" ? "flex-end" : "flex-start";
  const frameJustifyContentDefault: PbContentGuidelines["frameJustifyContentDefault"] =
    seeds.alignment === "center" ? "center" : seeds.alignment === "end" ? "flex-end" : "flex-start";

  return {
    copyTextAlign,
    frameGapWhenUnset: seeds.useDefaultFrameGap ? rem(b * 2) : null,
    frameRowGapWhenUnset: null,
    frameColumnGapWhenUnset: null,
    frameAlignItemsDefault,
    frameFlexDirectionDefault: "row",
    frameJustifyContentDefault,
    framePaddingDefault: "0",
    frameFlexWrapDefault: "nowrap",
    frameBorderRadiusDefault: rem(r),
    richTextParagraphGap: rem(b),
    richTextCodeBorderRadius: rem(r),
    richTextHeadingH1Margin: `${rem(b * 2)} ${rem(b * 0.5)}`,
    richTextHeadingH1MarginTop: null,
    richTextHeadingH1MarginBottom: null,
    richTextHeadingH2Margin: `${rem(b * 1.5)} ${rem(b * 0.5)}`,
    richTextHeadingH2MarginTop: null,
    richTextHeadingH2MarginBottom: null,
    richTextHeadingH3Margin: `${rem(b * 1)} ${rem(b * 0.5)}`,
    richTextHeadingH3MarginTop: null,
    richTextHeadingH3MarginBottom: null,
    richTextListMarginY: rem(b),
    richTextBlockquoteMarginY: rem(b),
    richTextHrMarginY: rem(b * 1.5),
    richTextPreWrapMarginY: rem(b * 1.5),
    buttonLabelGap: rem(b),
    buttonNakedPadding: `${rem(b)} ${rem(b * 2.5)}`,
    buttonNakedPaddingY: null,
    buttonNakedPaddingX: null,
    buttonNakedBorderRadius: rem(r),
    sectionGap: null,
  };
}

export function mergeGuidelinesWithLocks(
  proposed: PbContentGuidelines,
  prev: PbContentGuidelines,
  locks: Record<keyof PbContentGuidelines, boolean>
): PbContentGuidelines {
  const out = { ...proposed };
  for (const k of Object.keys(out) as (keyof PbContentGuidelines)[]) {
    if (locks[k]) (out as Record<string, unknown>)[k] = prev[k];
  }
  return out;
}

/** All guideline keys for iteration. */
export const PB_GUIDELINE_KEYS: (keyof PbContentGuidelines)[] = [
  "copyTextAlign",
  "frameGapWhenUnset",
  "frameRowGapWhenUnset",
  "frameColumnGapWhenUnset",
  "frameAlignItemsDefault",
  "frameFlexDirectionDefault",
  "frameJustifyContentDefault",
  "framePaddingDefault",
  "frameFlexWrapDefault",
  "frameBorderRadiusDefault",
  "richTextParagraphGap",
  "richTextCodeBorderRadius",
  "richTextHeadingH1Margin",
  "richTextHeadingH1MarginTop",
  "richTextHeadingH1MarginBottom",
  "richTextHeadingH2Margin",
  "richTextHeadingH2MarginTop",
  "richTextHeadingH2MarginBottom",
  "richTextHeadingH3Margin",
  "richTextHeadingH3MarginTop",
  "richTextHeadingH3MarginBottom",
  "richTextListMarginY",
  "richTextBlockquoteMarginY",
  "richTextHrMarginY",
  "richTextPreWrapMarginY",
  "buttonLabelGap",
  "buttonNakedPadding",
  "buttonNakedPaddingY",
  "buttonNakedPaddingX",
  "buttonNakedBorderRadius",
  "sectionGap",
];

export function emptyLocks(): Record<keyof PbContentGuidelines, boolean> {
  return Object.fromEntries(PB_GUIDELINE_KEYS.map((k) => [k, false])) as Record<
    keyof PbContentGuidelines,
    boolean
  >;
}
