/**
 * @deprecated Use `@/app/theme/pb-content-guidelines` instead.
 *
 * Dual defaults model bridge.
 *
 * This file derives a flat `PbContentGuidelines` shape from the grouped
 * `PbBuilderDefaults` model (source of truth in `pb-builder-defaults.ts`).
 *
 * **Migration:** Once the runtime fully consumes `PbBuilderDefaultsV3` directly,
 * remove this file and use `resolvePbDefaultsLayers()` from `pb-defaults-architecture.ts`.
 *
 * **Colors** -> `theme/config.ts`; **type scale** -> `fonts/type-scale.ts`.
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

/** @deprecated Legacy flat shape derived from grouped defaults for backward compatibility. */
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
  "sectionGap",
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
