/**
 * Derives injected `--pb-*` CSS variables from logical `PbContentGuidelines` fields
 * (block margins, block padding, etc.).
 */
import type { CSSProperties } from "react";
import { scaleRadiusForDensity } from "@pb/contracts";

export type PbContentGuidelines = {
  copyTextAlign: CSSProperties["textAlign"];

  frameGapWhenUnset: string | null;
  frameRowGapWhenUnset: string | null;
  frameColumnGapWhenUnset: string | null;
  frameAlignItemsDefault: NonNullable<CSSProperties["alignItems"]>;
  frameFlexDirectionDefault: NonNullable<CSSProperties["flexDirection"]>;
  /** Applied when JSON omits justifyContent or sends empty string. */
  frameJustifyContentDefault: string;
  /** Padding shorthand when JSON sets no padding. */
  framePaddingDefault: string;
  frameFlexWrapDefault: NonNullable<CSSProperties["flexWrap"]>;
  /** Border radius for `elementGroup` when JSON omits `borderRadius`. */
  frameBorderRadiusDefault: string;

  richTextCodeBorderRadius: string;

  /** Rich heading: one or two lengths (`top` `bottom`); optional top/bottom override if different. */
  richTextParagraphGap: string;
  richTextHeadingH1Margin: string;
  richTextHeadingH1MarginTop: string | null;
  richTextHeadingH1MarginBottom: string | null;
  richTextHeadingH2Margin: string;
  richTextHeadingH2MarginTop: string | null;
  richTextHeadingH2MarginBottom: string | null;
  richTextHeadingH3Margin: string;
  richTextHeadingH3MarginTop: string | null;
  richTextHeadingH3MarginBottom: string | null;

  richTextListMarginY: string;
  richTextBlockquoteMarginY: string;
  richTextHrMarginY: string;
  richTextPreWrapMarginY: string;

  /** Button naked chrome: `vertical horizontal` or single length; optional Y/X overrides. */
  buttonLabelGap: string;
  buttonNakedPadding: string;
  buttonNakedPaddingY: string | null;
  buttonNakedPaddingX: string | null;
  buttonNakedBorderRadius: string;
};

/** `block` is one length (all axes) or two lengths (top/bottom). Optional `top`/`bottom` win when non-empty. */
export function resolveBlockMarginPair(
  block: string,
  top: string | null,
  bottom: string | null
): { top: string; bottom: string } {
  const parts = block.trim().split(/\s+/).filter(Boolean);
  let baseTop: string;
  let baseBottom: string;
  if (parts.length >= 2) {
    baseTop = parts[0] ?? "0";
    baseBottom = parts[1] ?? "0";
  } else {
    const one = parts[0] ?? "0";
    baseTop = one;
    baseBottom = one;
  }
  const t = top?.trim();
  const b = bottom?.trim();
  return {
    top: t && t.length > 0 ? t : baseTop,
    bottom: b && b.length > 0 ? b : baseBottom,
  };
}

/** `block` is `y x` or single length; optional `y`/`x` win when non-empty. */
export function resolveAxisPadding(
  block: string,
  y: string | null,
  x: string | null
): { py: string; px: string } {
  const parts = block.trim().split(/\s+/).filter(Boolean);
  let baseY: string;
  let baseX: string;
  if (parts.length >= 2) {
    baseY = parts[0] ?? "0";
    baseX = parts[1] ?? "0";
  } else {
    const one = parts[0] ?? "0";
    baseY = one;
    baseX = one;
  }
  const yy = y?.trim();
  const xx = x?.trim();
  return {
    py: yy && yy.length > 0 ? yy : baseY,
    px: xx && xx.length > 0 ? xx : baseX,
  };
}

export function expandGuidelinesToCssVars(g: PbContentGuidelines): Record<string, string> {
  const h1 = resolveBlockMarginPair(
    g.richTextHeadingH1Margin,
    g.richTextHeadingH1MarginTop,
    g.richTextHeadingH1MarginBottom
  );
  const h2 = resolveBlockMarginPair(
    g.richTextHeadingH2Margin,
    g.richTextHeadingH2MarginTop,
    g.richTextHeadingH2MarginBottom
  );
  const h3 = resolveBlockMarginPair(
    g.richTextHeadingH3Margin,
    g.richTextHeadingH3MarginTop,
    g.richTextHeadingH3MarginBottom
  );
  const btn = resolveAxisPadding(
    g.buttonNakedPadding,
    g.buttonNakedPaddingY,
    g.buttonNakedPaddingX
  );

  return {
    "--pb-copy-text-align": String(g.copyTextAlign),
    "--pb-frame-border-radius": scaleRadiusForDensity(g.frameBorderRadiusDefault),
    "--pb-rich-text-code-radius": scaleRadiusForDensity(g.richTextCodeBorderRadius),
    "--pb-rich-text-p-gap": g.richTextParagraphGap,
    "--pb-rich-text-h1-mt": h1.top,
    "--pb-rich-text-h1-mb": h1.bottom,
    "--pb-rich-text-h2-mt": h2.top,
    "--pb-rich-text-h2-mb": h2.bottom,
    "--pb-rich-text-h3-mt": h3.top,
    "--pb-rich-text-h3-mb": h3.bottom,
    "--pb-rich-text-list-my": g.richTextListMarginY,
    "--pb-rich-text-bq-my": g.richTextBlockquoteMarginY,
    "--pb-rich-text-hr-my": g.richTextHrMarginY,
    "--pb-rich-text-pre-my": g.richTextPreWrapMarginY,
    "--pb-button-label-gap": g.buttonLabelGap,
    "--pb-button-naked-pad-y": btn.py,
    "--pb-button-naked-pad-x": btn.px,
    "--pb-button-naked-radius": scaleRadiusForDensity(g.buttonNakedBorderRadius),
  };
}

export function serializePbContentGuidelinesToCss(g: PbContentGuidelines): string {
  const vars = expandGuidelinesToCssVars(g);
  const lines = Object.keys(vars)
    .sort()
    .map((k) => `  ${k}: ${vars[k]};`);
  return `:root {\n${lines.join("\n")}\n}`;
}
