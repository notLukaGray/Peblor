"use client";

import type { CSSProperties } from "react";
import type { FontWeightMap } from "@/app/fonts/config";
import type { TypeScaleConfig, TypeScaleEntry } from "@/app/fonts/type-scale";
import { TYPE_SCALE_LABELS, TYPE_SCALE_UTILITY_CLASS } from "@/app/fonts/type-scale";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import { localRolePreviewFamily } from "@/app/dev/fonts/local-font-preview";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";
import { resolveWeightPickerMode } from "./font-dev-slot-logic";
import type { SlotName, SlotPreviewMode, SlotState } from "./font-dev-persistence";

export const SLOT_UI_LABEL: Record<SlotName, string> = {
  primary: "Primary",
  secondary: "Secondary",
  mono: "Mono",
};

export const TRIO_DEMO_DEFAULTS = {
  kicker: "bodyMd",
  headline: "headingXl",
  lead: "bodyXl",
  body: "body2xl",
  quote: "bodyXl",
  codePara: "body2xl",
} as const satisfies Record<string, keyof TypeScaleConfig>;

export type TrioDemoBlockId = keyof typeof TRIO_DEMO_DEFAULTS;
export type TrioPreviewBreakpoint = "desktop" | "mobile";

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function wghtPreviewStyle(
  fontFamilyCss: string,
  weight: number,
  variableFace: boolean
): CSSProperties {
  const style: CSSProperties = { fontFamily: fontFamilyCss, fontWeight: weight };
  if (variableFace) style.fontVariationSettings = `"wght" ${weight}`;
  return style;
}

function resolveCompositeItalicStyle(
  italicMode: "inherit" | "normal" | "italic",
  slotItalic: boolean
): CSSProperties["fontStyle"] {
  if (italicMode === "normal") return "normal";
  if (italicMode === "italic") return "italic";
  return slotItalic ? "italic" : "normal";
}

function resolveCompositeFontFamilyCss(
  slot: SlotName,
  role: keyof FontWeightMap,
  state: SlotState,
  localActive: boolean
): string {
  const face = localActive ? localRolePreviewFamily(slot, role) : state.family;
  const generic = slot === "mono" ? "ui-monospace, monospace" : "sans-serif";
  return `'${face}', ${generic}`;
}

export function compositeTextStyle(
  slot: SlotName,
  role: keyof FontWeightMap,
  configs: Record<SlotName, SlotState>,
  effectiveSlotPreviewMode: Record<SlotName, SlotPreviewMode>,
  previews: Partial<Record<SlotName, LocalPreviewRuntime>>,
  fontList: Record<string, BunnyFontMeta>,
  italicMode: "inherit" | "normal" | "italic" = "inherit"
): CSSProperties {
  const state = configs[slot];
  const mode = effectiveSlotPreviewMode[slot];
  const lib = previews[slot];
  const meta = fontList[slugify(state.family)];
  const picker = resolveWeightPickerMode(mode, meta, lib);
  const localActive = mode === "local" && Boolean(lib?.files.length);
  const fontFamilyCss = resolveCompositeFontFamilyCss(slot, role, state, localActive);
  const fontWeight = state.weights[role] ?? 400;
  return {
    ...wghtPreviewStyle(fontFamilyCss, fontWeight, picker.kind === "variable" && !localActive),
    fontStyle: resolveCompositeItalicStyle(italicMode, state.italic),
  };
}

export function trioHoverTitle(
  scaleKey: keyof TypeScaleConfig,
  slot?: SlotName,
  extra?: string
): string {
  let text = `${TYPE_SCALE_LABELS[scaleKey]} · ${TYPE_SCALE_UTILITY_CLASS[scaleKey]}`;
  if (slot) text += ` · ${SLOT_UI_LABEL[slot]} slot`;
  if (extra) text += ` · ${extra}`;
  return text;
}

export function trioHeadingTagFromScaleKey(
  key: keyof TypeScaleConfig
): "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" {
  if (key === "heading2xl") return "h1";
  if (key === "headingXl") return "h2";
  if (key === "headingLg") return "h3";
  if (key === "headingMd") return "h4";
  if (key === "headingSm") return "h5";
  if (key === "headingXs") return "h6";
  return "p";
}

export function trioEntryMetrics(
  entry: TypeScaleEntry,
  breakpoint: TrioPreviewBreakpoint
): { sz: number; lh: number } {
  return breakpoint === "desktop"
    ? { sz: entry.sizeDesktop, lh: entry.lineHeightDesktop }
    : { sz: entry.sizeMobile, lh: entry.lineHeightMobile };
}
