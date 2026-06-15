import type { StyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";

export const SPACING_STEP_KEYS = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const;
export const SHADOW_LEVEL_KEYS = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const;
export const BORDER_WIDTH_KEYS = ["hairline", "sm", "md", "lg", "xl"] as const;
export const CONTENT_WIDTH_KEYS = ["narrow", "standard", "wide", "full"] as const;
export const SECTION_MARGIN_KEYS = ["none", "xs", "sm", "md", "lg", "xl"] as const;
export const OPACITY_KEYS = ["muted", "dimmed", "subtle", "strong", "full"] as const;
export const Z_INDEX_KEYS = [
  "base",
  "raised",
  "overlay",
  "modal",
  "toast",
  "tooltip",
  "max",
] as const;
export const DURATION_KEYS = ["instant", "fast", "normal", "slow", "slower"] as const;
export const EASING_KEYS = [
  "easeIn",
  "easeOut",
  "easeInOut",
  "spring",
  "bounce",
  "linear",
] as const;

export type SpacingStepKey = (typeof SPACING_STEP_KEYS)[number];
export type ShadowLevelKey = (typeof SHADOW_LEVEL_KEYS)[number];
export type BorderWidthKey = (typeof BORDER_WIDTH_KEYS)[number];
export type ContentWidthKey = (typeof CONTENT_WIDTH_KEYS)[number];
export type SectionMarginKey = (typeof SECTION_MARGIN_KEYS)[number];
export type OpacityKey = (typeof OPACITY_KEYS)[number];
export type ZIndexKey = (typeof Z_INDEX_KEYS)[number];
export type DurationKey = (typeof DURATION_KEYS)[number];
export type EasingKey = (typeof EASING_KEYS)[number];

export type StyleFoundationSlices = Pick<
  StyleToolPersistedV3,
  | "shadowScale"
  | "shadowScaleDark"
  | "borderWidthScale"
  | "motion"
  | "breakpoints"
  | "contentWidths"
  | "sectionMarginScale"
  | "sectionMarginScaleLocks"
  | "opacityScale"
  | "zIndexLayers"
>;
