import type { WorkbenchSessionV2 } from "@/app/dev/workbench/workbench-defaults";
import { breakpointsToCssVars } from "@/app/theme/pb-breakpoint-tokens";
import { motionFoundationsToCssVars } from "@/app/theme/pb-motion-tokens";
import { shadowScaleDarkToCssVars, shadowScaleToCssVars } from "@/app/theme/pb-shadow-tokens";
import {
  borderWidthScaleToCssVars,
  contentWidthPresetsToCssVars,
  letterSpacingScaleToCssVars,
  lineHeightScaleToCssVars,
  sectionMarginScaleToCssVars,
  spacingScaleToCssVars,
} from "@/app/theme/pb-spacing-tokens";
import { zIndexLayersToCssVars } from "@/app/theme/pb-z-index-layers";
import { typeScaleToCssVars } from "@/app/theme/pb-type-scale-tokens";

function mergeCssVars(...maps: Array<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const map of maps) {
    Object.assign(out, map);
  }
  return out;
}

function serializeCssVarSelector(selector: string, vars: Record<string, string>): string {
  const lines = Object.keys(vars)
    .sort()
    .map((key) => `  ${key}: ${vars[key]};`)
    .join("\n");
  return `${selector} {\n${lines}\n}`;
}

export function getPbFoundationCssVarMaps(session: Pick<WorkbenchSessionV2, "style" | "fonts">): {
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

export function serializePbFoundationsCss(
  session: Pick<WorkbenchSessionV2, "style" | "fonts">
): string {
  const vars = getPbFoundationCssVarMaps(session);
  return `${serializeCssVarSelector(":root", vars.root)}\n\n${serializeCssVarSelector(".dark", vars.dark)}`;
}
