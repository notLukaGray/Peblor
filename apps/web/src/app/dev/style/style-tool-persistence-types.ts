import type { BreakpointDefinitions } from "@/app/theme/pb-breakpoint-tokens";
import type { MotionFoundations } from "@/app/theme/pb-motion-tokens";
import type { OpacityScale } from "@/app/theme/pb-opacity-tokens";
import type {
  BorderWidthScale,
  ContentWidthPresets,
  SectionMarginScale,
  SpacingScale,
} from "@/app/theme/pb-spacing-tokens";
import type { ShadowScale } from "@/app/theme/pb-shadow-tokens";
import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import type { StyleToolSeeds } from "@/app/theme/pb-style-suggest";
import type { ZIndexLayerScale } from "@/app/theme/pb-z-index-layers";

/** Legacy keys; values migrate into `workbench-session-v2`. */
export const STYLE_TOOL_LEGACY_STORAGE_KEY_V1 = "pb-style-tool-guidelines-v1";
export const STYLE_TOOL_LEGACY_STORAGE_KEY_V2 = "pb-style-tool-v2";

export const SPACING_SCALE_KEYS = [
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
] as const;
export const SPACING_SCALE_SEED_KEYS = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const;
export const SHADOW_SCALE_KEYS = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const;
export const BORDER_WIDTH_KEYS = ["hairline", "sm", "md", "lg", "xl"] as const;
export const CONTENT_WIDTH_KEYS = ["narrow", "standard", "wide", "full"] as const;
export const SECTION_MARGIN_KEYS = ["none", "xs", "sm", "md", "lg", "xl"] as const;

export type StyleToolPersistedV2 = {
  v: 2;
  seeds: StyleToolSeeds;
  locks: Record<keyof PbContentGuidelines, boolean>;
  guidelines: PbContentGuidelines;
};

export type StyleToolPersistedV3 = {
  v: 3;
  seeds: StyleToolSeeds;
  locks: Record<keyof PbContentGuidelines, boolean>;
  guidelines: PbContentGuidelines;
  spacingScale: SpacingScale;
  spacingScaleLocks: Record<keyof SpacingScale, boolean>;
  shadowScale: ShadowScale;
  shadowScaleDark: ShadowScale;
  borderWidthScale: BorderWidthScale;
  motion: MotionFoundations;
  breakpoints: BreakpointDefinitions;
  contentWidths: ContentWidthPresets;
  sectionMarginScale: SectionMarginScale;
  sectionMarginScaleLocks: Record<keyof SectionMarginScale, boolean>;
  opacityScale: OpacityScale;
  zIndexLayers: ZIndexLayerScale;
};
