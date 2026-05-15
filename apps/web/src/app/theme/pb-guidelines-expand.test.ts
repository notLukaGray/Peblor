import { describe, expect, it } from "vitest";
import {
  resolveAxisPadding,
  resolveBlockMarginPair,
  expandGuidelinesToCssVars,
  type PbContentGuidelines,
} from "./pb-guidelines-expand";

describe("pb-guidelines-expand", () => {
  it("resolveBlockMarginPair uses block or overrides", () => {
    expect(resolveBlockMarginPair("1rem 0.25rem", null, null)).toEqual({
      top: "1rem",
      bottom: "0.25rem",
    });
    expect(resolveBlockMarginPair("0.5rem", null, null)).toEqual({
      top: "0.5rem",
      bottom: "0.5rem",
    });
    expect(resolveBlockMarginPair("1rem 0.25rem", "2rem", null)).toEqual({
      top: "2rem",
      bottom: "0.25rem",
    });
    expect(resolveBlockMarginPair("1rem 0.25rem", null, "0")).toEqual({ top: "1rem", bottom: "0" });
  });

  it("resolveAxisPadding uses block or overrides", () => {
    expect(resolveAxisPadding("0.5rem 1.25rem", null, null)).toEqual({
      py: "0.5rem",
      px: "1.25rem",
    });
    expect(resolveAxisPadding("1rem", null, "2rem")).toEqual({ py: "1rem", px: "2rem" });
  });

  it("expandGuidelinesToCssVars matches resolved pairs", () => {
    const g = {
      copyTextAlign: "center",
      frameGapWhenUnset: null,
      frameRowGapWhenUnset: null,
      frameColumnGapWhenUnset: null,
      frameAlignItemsDefault: "center",
      frameFlexDirectionDefault: "row",
      frameJustifyContentDefault: "center",
      framePaddingDefault: "0",
      frameFlexWrapDefault: "nowrap",
      frameBorderRadiusDefault: "4px",
      richTextParagraphGap: "0.5rem",
      richTextCodeBorderRadius: "8px",
      richTextHeadingH3Margin: "1rem 0",
      richTextHeadingH3MarginTop: "2rem",
      richTextHeadingH3MarginBottom: null,
      richTextHeadingH1Margin: "0 0",
      richTextHeadingH1MarginTop: null,
      richTextHeadingH1MarginBottom: null,
      richTextHeadingH2Margin: "0 0",
      richTextHeadingH2MarginTop: null,
      richTextHeadingH2MarginBottom: null,
      richTextListMarginY: "0",
      richTextBlockquoteMarginY: "0",
      richTextHrMarginY: "0",
      richTextPreWrapMarginY: "0",
      buttonLabelGap: "0",
      buttonNakedPadding: "a b",
      buttonNakedPaddingY: "y",
      buttonNakedPaddingX: null,
      buttonNakedBorderRadius: "6px",
    } satisfies PbContentGuidelines;
    const v = expandGuidelinesToCssVars(g);
    expect(v["--pb-rich-text-h3-mt"]).toBe("2rem");
    expect(v["--pb-rich-text-h3-mb"]).toBe("0");
    expect(v["--pb-button-naked-pad-y"]).toBe("y");
    expect(v["--pb-button-naked-pad-x"]).toBe("b");
    expect(v["--pb-frame-border-radius"]).toBe(
      "calc((4px) * var(--pb-density-radius-multiplier, 1))"
    );
    expect(v["--pb-rich-text-code-radius"]).toBe(
      "calc((8px) * var(--pb-density-radius-multiplier, 1))"
    );
    expect(v["--pb-button-naked-radius"]).toBe(
      "calc((6px) * var(--pb-density-radius-multiplier, 1))"
    );
  });
});
