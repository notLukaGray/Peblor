/**
 * Legacy flat peblor defaults (frames, rich-text rhythm, button chrome).
 * Source-of-truth now lives in `pb-builder-defaults.ts` (grouped by sections/modules/elements),
 * and this file derives the runtime flat shape for backward compatibility.
 *
 * **Colors** → `theme/config.ts`; **type scale** → `fonts/type-scale.ts`.
 */
import {
  type PbContentGuidelines,
  serializePbContentGuidelinesToCss,
} from "@/app/theme/pb-guidelines-expand";
import {
  pbBuilderDefaultsV1,
  toPbContentGuidelines,
  type PbBuilderDefaults,
} from "@/app/theme/pb-builder-defaults";

export type { PbContentGuidelines } from "@/app/theme/pb-guidelines-expand";

/** Grouped defaults model (sections/modules/elements), source-of-truth for style defaults. */
export const pbBuilderDefaults: PbBuilderDefaults = pbBuilderDefaultsV1;

/** Legacy flat shape consumed by runtime today. Derived from grouped defaults for compatibility. */
export const pbContentGuidelines: PbContentGuidelines = toPbContentGuidelines(pbBuilderDefaults);

export function pbContentGuidelinesCssInline(): string {
  return serializePbContentGuidelinesToCss(pbContentGuidelines);
}

function fmtKey(k: keyof PbContentGuidelines, v: PbContentGuidelines[typeof k]): string {
  if (v === null) return `  ${String(k)}: null,`;
  return `  ${String(k)}: ${JSON.stringify(v)},`;
}

/** Keys in a stable documentation order (matches dev tool sections). */
const CONFIG_EXPORT_KEY_ORDER: (keyof PbContentGuidelines)[] = [
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
];

/** Legacy flat-file export used by `/dev/style` until grouped defaults editor lands. */
export function pbContentGuidelinesConfigFileExport(g: PbContentGuidelines): string {
  const body = CONFIG_EXPORT_KEY_ORDER.map((k) => fmtKey(k, g[k])).join("\n");

  return [
    "/**",
    " * Page-builder **layout & copy** defaults.",
    " * Expansion → `pb-guidelines-expand.ts`. Edit via `/dev/style` or by hand.",
    " */",
    'import type { PbContentGuidelines } from "@/app/theme/pb-guidelines-expand";',
    'import { serializePbContentGuidelinesToCss } from "@/app/theme/pb-guidelines-expand";',
    "",
    'export type { PbContentGuidelines } from "@/app/theme/pb-guidelines-expand";',
    "",
    "export const pbContentGuidelines: PbContentGuidelines = {",
    body,
    "};",
    "",
    "export function pbContentGuidelinesCssInline(): string {",
    "  return serializePbContentGuidelinesToCss(pbContentGuidelines);",
    "}",
  ].join("\n");
}
