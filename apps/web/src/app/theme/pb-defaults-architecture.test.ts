import { describe, expect, it } from "vitest";
import {
  applyLinkedInference,
  createPbDefaultsFromLegacyGuidelines,
  mergeDefaultsWithBlockJson,
  resolvePbDefaultsLayers,
  type PbBuilderDefaultsV3,
} from "./pb-defaults-architecture";
import type { PbContentGuidelines } from "./pb-guidelines-expand";

const LEGACY_GUIDELINES_FIXTURE: PbContentGuidelines = {
  copyTextAlign: "center",
  frameGapWhenUnset: "1rem",
  frameRowGapWhenUnset: null,
  frameColumnGapWhenUnset: null,
  frameAlignItemsDefault: "center",
  frameFlexDirectionDefault: "row",
  frameJustifyContentDefault: "center",
  framePaddingDefault: "0",
  frameFlexWrapDefault: "nowrap",
  frameBorderRadiusDefault: "0.375rem",
  richTextParagraphGap: "0.5rem",
  richTextCodeBorderRadius: "0.5rem",
  richTextHeadingH1Margin: "1rem 0.25rem",
  richTextHeadingH1MarginTop: null,
  richTextHeadingH1MarginBottom: null,
  richTextHeadingH2Margin: "0.75rem 0.25rem",
  richTextHeadingH2MarginTop: null,
  richTextHeadingH2MarginBottom: null,
  richTextHeadingH3Margin: "0.5rem 0.25rem",
  richTextHeadingH3MarginTop: null,
  richTextHeadingH3MarginBottom: null,
  richTextListMarginY: "0.5rem",
  richTextBlockquoteMarginY: "0.5rem",
  richTextHrMarginY: "0.75rem",
  richTextPreWrapMarginY: "0.75rem",
  buttonLabelGap: "0.5rem",
  buttonNakedPadding: "0.5rem 1.25rem",
  buttonNakedPaddingY: null,
  buttonNakedPaddingX: null,
  buttonNakedBorderRadius: "0.375rem",
};

function createBaseDefaults(): PbBuilderDefaultsV3 {
  return createPbDefaultsFromLegacyGuidelines(LEGACY_GUIDELINES_FIXTURE);
}

describe("pb-defaults-architecture", () => {
  it("resolves layered precedence and keeps explicit top-layer values", () => {
    const engine = createBaseDefaults();
    const resolved = resolvePbDefaultsLayers({
      engine,
      theme: {
        foundation: { spacing: { baseRem: 0.75 } },
      },
      project: {
        elements: {
          button: {
            variants: {
              default: { borderRadius: "0.25rem" },
            },
          },
        },
      },
      session: {
        elements: {
          button: {
            variants: {
              default: { borderRadius: "1rem" },
            },
          },
        },
      },
    });

    expect(resolved.foundation.spacing.baseRem).toBe(0.75);
    expect(resolved.elements.button.variants.default.borderRadius).toBe("1rem");
  });

  it("applies linked inference only when target is unset for fillIfUnset", () => {
    const defaults = createBaseDefaults();
    defaults.elements.image.borderRadius = "";
    defaults.elements.button.variants.default.borderRadius = "2rem";

    const inferred = applyLinkedInference(defaults);

    expect(inferred.elements.image.borderRadius).toBe(defaults.foundation.radius.md);
    expect(inferred.elements.button.variants.default.borderRadius).toBe("2rem");
  });

  it("merges runtime defaults with block JSON where JSON wins", () => {
    const blockDefaults = {
      borderRadius: "0.375rem",
      paddingX: "1.25rem",
      paddingY: "0.5rem",
    };
    const blockJson = {
      borderRadius: "2rem",
      paddingY: "0.75rem",
    };

    const resolved = mergeDefaultsWithBlockJson(blockDefaults, blockJson);

    expect(resolved.borderRadius).toBe("2rem");
    expect(resolved.paddingX).toBe("1.25rem");
    expect(resolved.paddingY).toBe("0.75rem");
  });

  it("maps legacy guidelines into object-scoped defaults", () => {
    const mapped = createPbDefaultsFromLegacyGuidelines(LEGACY_GUIDELINES_FIXTURE);

    expect(mapped.elements.frame.gap).toBe("1rem");
    expect(mapped.elements.richText.paragraphGap).toBe("0.5rem");
    expect(mapped.elements.button.variants.default.paddingX).toBe("1.25rem");
    expect(mapped.elements.image.borderRadius).toBe("0.375rem");
  });
});
