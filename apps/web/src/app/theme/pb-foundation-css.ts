import type { BreakpointDefinitions } from "@/app/theme/pb-breakpoint-tokens";
import { breakpointsToCssVars } from "@/app/theme/pb-breakpoint-tokens";
import type { MotionFoundations } from "@/app/theme/pb-motion-tokens";
import { motionFoundationsToCssVars } from "@/app/theme/pb-motion-tokens";
import type { ShadowScale } from "@/app/theme/pb-shadow-tokens";
import { shadowScaleDarkToCssVars, shadowScaleToCssVars } from "@/app/theme/pb-shadow-tokens";
import type {
  BorderWidthScale,
  ContentWidthPresets,
  LetterSpacingScale,
  LineHeightScale,
  SectionMarginScale,
  SpacingScale,
} from "@/app/theme/pb-spacing-tokens";
import {
  borderWidthScaleToCssVars,
  contentWidthPresetsToCssVars,
  letterSpacingScaleToCssVars,
  lineHeightScaleToCssVars,
  sectionMarginScaleToCssVars,
  spacingScaleToCssVars,
} from "@/app/theme/pb-spacing-tokens";
import type { ZIndexLayerScale } from "@/app/theme/pb-z-index-layers";
import { zIndexLayersToCssVars } from "@/app/theme/pb-z-index-layers";
import { typeScaleToCssVars } from "@/app/theme/pb-type-scale-tokens";
import type { TypeScaleConfig } from "@/app/fonts/type-scale";
import { mergeCssVars, serializeCssVarSelector } from "@/app/theme/pb-foundation-config";

/** Minimal structural subset of WorkbenchSessionV2 used by this module. */
export type FoundationSession = {
  style: {
    spacingScale: SpacingScale;
    shadowScale: ShadowScale;
    shadowScaleDark: ShadowScale;
    borderWidthScale: BorderWidthScale;
    motion: MotionFoundations;
    breakpoints: BreakpointDefinitions;
    contentWidths: ContentWidthPresets;
    sectionMarginScale: SectionMarginScale;
    zIndexLayers: ZIndexLayerScale;
  };
  fonts: {
    lineHeightScale: LineHeightScale;
    letterSpacingScale: LetterSpacingScale;
    typeScale: TypeScaleConfig;
  };
};

export function getPbFoundationCssVarMaps(session: FoundationSession): {
  root: Record<string, string>;
  dark: Record<string, string>;
} {
  const root = mergeCssVars(
    spacingScaleToCssVars(session.style.spacingScale),
    shadowScaleToCssVars(session.style.shadowScale),
    borderWidthScaleToCssVars(session.style.borderWidthScale),
    motionFoundationsToCssVars(session.style.motion),
    breakpointsToCssVars(session.style.breakpoints),
    contentWidthPresetsToCssVars(session.style.contentWidths),
    sectionMarginScaleToCssVars(session.style.sectionMarginScale),
    zIndexLayersToCssVars(session.style.zIndexLayers),
    lineHeightScaleToCssVars(session.fonts.lineHeightScale),
    letterSpacingScaleToCssVars(session.fonts.letterSpacingScale),
    typeScaleToCssVars(session.fonts.typeScale)
  );

  const dark = mergeCssVars(shadowScaleDarkToCssVars(session.style.shadowScaleDark));

  return { root, dark };
}

export function serializePbFoundationsCss(session: FoundationSession): string {
  const vars = getPbFoundationCssVarMaps(session);
  return `${serializeCssVarSelector(":root", vars.root)}\n\n${serializeCssVarSelector(".dark", vars.dark)}`;
}
