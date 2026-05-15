import type { PbFoundationDefaults } from "@/app/theme/pb-defaults-architecture";

export type SpacingScale = PbFoundationDefaults["spacing"]["scale"];

const SPACING_SCALE_MULTIPLIERS = {
  xs: 0.333,
  sm: 0.667,
  md: 1,
  lg: 1.333,
  xl: 2,
  "2xl": 2.667,
  "3xl": 4,
  "4xl": 6,
} as const;

type SpacingScaleKey = keyof typeof SPACING_SCALE_MULTIPLIERS;

function toRoundedRem(value: number): string {
  return `${Number(value.toFixed(3))}rem`;
}

export function parseRemFloat(value: string | null | undefined, fallback = 0): number {
  if (!value) return fallback;
  const match = value.trim().match(/^(-?\d*\.?\d+)\s*rem$/i);
  if (!match) return fallback;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : fallback;
}

export function deriveSpacingScale(baseRem: number): SpacingScale {
  const clampedBase = Number.isFinite(baseRem) ? Math.max(0.125, baseRem) : 0.125;
  const scale = {
    none: "0",
  } as SpacingScale;

  for (const key of Object.keys(SPACING_SCALE_MULTIPLIERS) as SpacingScaleKey[]) {
    scale[key] = toRoundedRem(clampedBase * SPACING_SCALE_MULTIPLIERS[key]);
  }

  return scale;
}

export function spacingScaleToCssVars(scale: SpacingScale): Record<string, string> {
  return {
    "--pb-space-none": scale.none,
    "--pb-space-xs": scale.xs,
    "--pb-space-sm": scale.sm,
    "--pb-space-md": scale.md,
    "--pb-space-lg": scale.lg,
    "--pb-space-xl": scale.xl,
    "--pb-space-2xl": scale["2xl"],
    "--pb-space-3xl": scale["3xl"],
    "--pb-space-4xl": scale["4xl"],
  };
}

export type BorderWidthScale = {
  hairline: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
};

export const DEFAULT_BORDER_WIDTH_SCALE: BorderWidthScale = {
  hairline: "0.5px",
  sm: "1px",
  md: "1.5px",
  lg: "2px",
  xl: "4px",
};

export function borderWidthScaleToCssVars(scale: BorderWidthScale): Record<string, string> {
  return {
    "--pb-border-hairline": scale.hairline,
    "--pb-border-sm": scale.sm,
    "--pb-border-md": scale.md,
    "--pb-border-lg": scale.lg,
    "--pb-border-xl": scale.xl,
  };
}

export type LineHeightScale = {
  tight: string;
  snug: string;
  normal: string;
  relaxed: string;
  loose: string;
};

export const DEFAULT_LINE_HEIGHT_SCALE: LineHeightScale = {
  tight: "1.1",
  snug: "1.25",
  normal: "1.5",
  relaxed: "1.625",
  loose: "2",
};

export function lineHeightScaleToCssVars(scale: LineHeightScale): Record<string, string> {
  return {
    "--pb-leading-tight": scale.tight,
    "--pb-leading-snug": scale.snug,
    "--pb-leading-normal": scale.normal,
    "--pb-leading-relaxed": scale.relaxed,
    "--pb-leading-loose": scale.loose,
  };
}

export type LetterSpacingScale = {
  tighter: string;
  tight: string;
  normal: string;
  wide: string;
  wider: string;
  widest: string;
};

export const DEFAULT_LETTER_SPACING_SCALE: LetterSpacingScale = {
  tighter: "-0.05em",
  tight: "-0.025em",
  normal: "0em",
  wide: "0.025em",
  wider: "0.05em",
  widest: "0.1em",
};

export function letterSpacingScaleToCssVars(scale: LetterSpacingScale): Record<string, string> {
  return {
    "--pb-tracking-tighter": scale.tighter,
    "--pb-tracking-tight": scale.tight,
    "--pb-tracking-normal": scale.normal,
    "--pb-tracking-wide": scale.wide,
    "--pb-tracking-wider": scale.wider,
    "--pb-tracking-widest": scale.widest,
  };
}

export type ContentWidthPresets = {
  narrow: string;
  standard: string;
  wide: string;
  /** Full-bleed content width (semantic alias for 100%). */
  full: string;
};

export const DEFAULT_CONTENT_WIDTH_PRESETS: ContentWidthPresets = {
  narrow: "640px",
  standard: "1024px",
  wide: "1280px",
  full: "100%",
};

export function contentWidthPresetsToCssVars(presets: ContentWidthPresets): Record<string, string> {
  return {
    "--pb-width-narrow": presets.narrow,
    "--pb-width-standard": presets.standard,
    "--pb-width-wide": presets.wide,
    "--pb-width-full": presets.full,
  };
}

export type SectionMarginScale = {
  none: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
};

export function deriveSectionMarginScale(spacingScale: SpacingScale): SectionMarginScale {
  const mdRem = parseRemFloat(spacingScale.md, 0.5);
  return {
    none: "0",
    xs: toRoundedRem(mdRem * 2),
    sm: toRoundedRem(mdRem * 4),
    md: toRoundedRem(mdRem * 6.667),
    lg: toRoundedRem(mdRem * 10.667),
    xl: toRoundedRem(mdRem * 16),
  };
}

export function sectionMarginScaleToCssVars(scale: SectionMarginScale): Record<string, string> {
  return {
    "--pb-section-margin-none": scale.none,
    "--pb-section-margin-xs": scale.xs,
    "--pb-section-margin-sm": scale.sm,
    "--pb-section-margin-md": scale.md,
    "--pb-section-margin-lg": scale.lg,
    "--pb-section-margin-xl": scale.xl,
  };
}
