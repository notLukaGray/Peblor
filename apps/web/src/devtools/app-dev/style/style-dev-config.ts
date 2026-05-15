import type { CSSProperties } from "react";
import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import { expandGuidelinesToCssVars } from "@/app/theme/pb-guidelines-expand";

/** Values accepted for `justify-content` on frames (dropdown; matches common peblor exports). */
export const FRAME_JUSTIFY_OPTIONS = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly",
] as const;

export const ROW_META: Record<keyof PbContentGuidelines, { label: string; hint: string }> = {
  copyTextAlign: {
    label: "Copy text-align",
    hint: "Default alignment when text block has no own alignment.",
  },
  frameGapWhenUnset: { label: "Frame · default gap", hint: "Fallback when slot has no `gap`." },
  frameRowGapWhenUnset: {
    label: "Frame · default row-gap",
    hint: "Fallback when there is no `rowGap`.",
  },
  frameColumnGapWhenUnset: {
    label: "Frame · default column-gap",
    hint: "Fallback when there is no `columnGap`.",
  },
  frameAlignItemsDefault: {
    label: "Frame · align-items",
    hint: "Fallback when group has no `alignItems`.",
  },
  frameFlexDirectionDefault: {
    label: "Frame · flex-direction",
    hint: "Fallback when group has no `flexDirection`.",
  },
  frameJustifyContentDefault: {
    label: "Frame · justify-content",
    hint: "Fallback when group has no `justifyContent`.",
  },
  framePaddingDefault: {
    label: "Frame · default padding",
    hint: "Fallback when group has no padding fields.",
  },
  frameFlexWrapDefault: {
    label: "Frame · flex-wrap",
    hint: "Fallback when group has no `flexWrap`.",
  },
  frameBorderRadiusDefault: {
    label: "Frame · default border-radius",
    hint: "Fallback when group has no radius.",
  },
  richTextParagraphGap: { label: "Rich · paragraph stack", hint: "[&+&] between paragraphs." },
  richTextCodeBorderRadius: {
    label: "Rich · fenced code radius",
    hint: "Code blocks / pre wrapper.",
  },
  richTextHeadingH1Margin: { label: "Rich · H1 margin (top bottom)", hint: "Two lengths or one." },
  richTextHeadingH1MarginTop: {
    label: "Rich · H1 margin-top override",
    hint: "Empty → use block pair.",
  },
  richTextHeadingH1MarginBottom: { label: "Rich · H1 margin-bottom override", hint: "" },
  richTextHeadingH2Margin: { label: "Rich · H2 margin (top bottom)", hint: "" },
  richTextHeadingH2MarginTop: { label: "Rich · H2 margin-top override", hint: "" },
  richTextHeadingH2MarginBottom: { label: "Rich · H2 margin-bottom override", hint: "" },
  richTextHeadingH3Margin: { label: "Rich · H3 margin (top bottom)", hint: "" },
  richTextHeadingH3MarginTop: { label: "Rich · H3 margin-top override", hint: "" },
  richTextHeadingH3MarginBottom: { label: "Rich · H3 margin-bottom override", hint: "" },
  richTextListMarginY: { label: "Rich · list / table Y", hint: "" },
  richTextBlockquoteMarginY: { label: "Rich · blockquote Y", hint: "" },
  richTextHrMarginY: { label: "Rich · hr Y", hint: "" },
  richTextPreWrapMarginY: { label: "Rich · code block Y", hint: "" },
  buttonLabelGap: { label: "Button · label ↔ icon gap", hint: "" },
  buttonNakedPadding: {
    label: "Button · naked padding (Y X)",
    hint: "Resolved to --pb-button-naked-pad-y/x.",
  },
  buttonNakedPaddingY: { label: "Button · naked pad Y override", hint: "Empty → use block pair." },
  buttonNakedPaddingX: { label: "Button · naked pad X override", hint: "" },
  buttonNakedBorderRadius: {
    label: "Button · naked border-radius",
    hint: "Wrapper-less chrome only.",
  },
};

export const FIELD_PLACEHOLDER: Partial<Record<keyof PbContentGuidelines, string>> = {
  frameGapWhenUnset: "e.g. 1rem — empty = no fallback",
  frameRowGapWhenUnset: "optional · e.g. 0.75rem",
  frameColumnGapWhenUnset: "optional · e.g. 0.75rem",
  framePaddingDefault: "e.g. 0 or 1rem",
  frameBorderRadiusDefault: "e.g. 0.375rem or 9999px",
  richTextParagraphGap: "e.g. 0.5rem",
  richTextCodeBorderRadius: "e.g. 0.5rem",
  richTextHeadingH1Margin: "e.g. 1rem 0.25rem",
  richTextHeadingH1MarginTop: "optional override · e.g. 1.5rem",
  richTextHeadingH1MarginBottom: "optional override · e.g. 0.25rem",
  richTextHeadingH2Margin: "e.g. 0.75rem 0.25rem",
  richTextHeadingH2MarginTop: "optional · e.g. 1rem",
  richTextHeadingH2MarginBottom: "optional · e.g. 0.25rem",
  richTextHeadingH3Margin: "e.g. 0.5rem 0.25rem",
  richTextHeadingH3MarginTop: "optional · e.g. 0.75rem",
  richTextHeadingH3MarginBottom: "optional · e.g. 0.25rem",
  richTextListMarginY: "e.g. 0.5rem",
  richTextBlockquoteMarginY: "e.g. 0.5rem",
  richTextHrMarginY: "e.g. 0.75rem",
  richTextPreWrapMarginY: "e.g. 0.75rem",
  buttonLabelGap: "e.g. 0.5rem",
  buttonNakedPadding: "e.g. 0.5rem 1.25rem",
  buttonNakedPaddingY: "optional · e.g. 0.75rem",
  buttonNakedPaddingX: "optional · e.g. 2rem",
  buttonNakedBorderRadius: "e.g. 0.375rem",
};

export const DEFAULT_FIELD_PLACEHOLDER = "CSS value";

export const SECTIONS: {
  title: string;
  blurb: string;
  keys: (keyof PbContentGuidelines)[];
}[] = [
  {
    title: "Frames",
    blurb: "Frame defaults for gap, direction, alignment, padding, wrapping, and radius.",
    keys: [
      "frameGapWhenUnset",
      "frameRowGapWhenUnset",
      "frameColumnGapWhenUnset",
      "frameAlignItemsDefault",
      "frameFlexDirectionDefault",
      "frameJustifyContentDefault",
      "framePaddingDefault",
      "frameFlexWrapDefault",
      "frameBorderRadiusDefault",
    ],
  },
  {
    title: "Copy",
    blurb: "Default text-align follows Alignment until locked.",
    keys: ["copyTextAlign"],
  },
  {
    title: "Rich text rhythm",
    blurb: "Per-level block margins with optional top/bottom overrides.",
    keys: [
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
    ],
  },
  {
    title: "Interactive",
    blurb: "Baseline button spacing and rounding.",
    keys: [
      "buttonLabelGap",
      "buttonNakedPadding",
      "buttonNakedPaddingY",
      "buttonNakedPaddingX",
      "buttonNakedBorderRadius",
    ],
  },
];

export type StyleDevScope =
  | "foundations"
  | "layout-frames"
  | "elements-rich-text"
  | "elements-button"
  | "all";

type ScopeConfig = {
  title: string;
  kicker: string;
  sectionTitles: string[];
  showGlobalSeeds: boolean;
};

export const SCOPE_CONFIG: Record<StyleDevScope, ScopeConfig> = {
  foundations: {
    title: "Style · Foundations",
    kicker: "Global primitives",
    sectionTitles: ["Copy"],
    showGlobalSeeds: true,
  },
  "layout-frames": {
    title: "Layout · Frames",
    kicker: "Frame defaults",
    sectionTitles: ["Frames"],
    showGlobalSeeds: false,
  },
  "elements-rich-text": {
    title: "Elements · Rich Text",
    kicker: "Element defaults",
    sectionTitles: ["Rich text rhythm"],
    showGlobalSeeds: false,
  },
  "elements-button": {
    title: "Elements · Button",
    kicker: "Element defaults",
    sectionTitles: ["Interactive"],
    showGlobalSeeds: false,
  },
  all: {
    title: "Spacing / Style",
    kicker: "Layer 3 · Seeds + locks",
    sectionTitles: ["Frames", "Copy", "Rich text rhythm", "Interactive"],
    showGlobalSeeds: true,
  },
};

const NULLABLE_STRING_KEYS = new Set<keyof PbContentGuidelines>([
  "frameGapWhenUnset",
  "frameRowGapWhenUnset",
  "frameColumnGapWhenUnset",
  "richTextHeadingH1MarginTop",
  "richTextHeadingH1MarginBottom",
  "richTextHeadingH2MarginTop",
  "richTextHeadingH2MarginBottom",
  "richTextHeadingH3MarginTop",
  "richTextHeadingH3MarginBottom",
  "buttonNakedPaddingY",
  "buttonNakedPaddingX",
]);

/** Exact variable map injected at runtime (same as `pbContentGuidelinesCssInline`). */
export function guidelinesToPreviewStyle(guidelines: PbContentGuidelines): CSSProperties {
  return expandGuidelinesToCssVars(guidelines) as CSSProperties;
}

export function formatDisplayValue(
  key: keyof PbContentGuidelines,
  guidelines: PbContentGuidelines
): string {
  const value = guidelines[key];
  return value === null ? "" : String(value);
}

export function parseFieldInput(
  key: keyof PbContentGuidelines,
  raw: string
): PbContentGuidelines[typeof key] {
  if (!NULLABLE_STRING_KEYS.has(key)) return raw as PbContentGuidelines[typeof key];
  const trimmed = raw.trim();
  return (trimmed === "" ? null : trimmed) as PbContentGuidelines[typeof key];
}
