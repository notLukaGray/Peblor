import { describe, expect, it } from "vitest";
import {
  buildSectionContentWrapperStyle,
  sectionHeightCanStretchContent,
} from "./section-content-block-content-wrapper-style";

describe("sectionHeightCanStretchContent", () => {
  it("does not stretch content inside intrinsic-height sections", () => {
    expect(sectionHeightCanStretchContent(undefined)).toBe(false);
    expect(sectionHeightCanStretchContent("hug")).toBe(false);
    expect(sectionHeightCanStretchContent("fit-content")).toBe(false);
    expect(sectionHeightCanStretchContent("auto")).toBe(false);
    expect(sectionHeightCanStretchContent("min-content")).toBe(false);
    expect(sectionHeightCanStretchContent("max-content")).toBe(false);
  });

  it("stretches content inside definite-height sections", () => {
    expect(sectionHeightCanStretchContent("100vh")).toBe(true);
    expect(sectionHeightCanStretchContent("100%")).toBe(true);
    expect(sectionHeightCanStretchContent("720px")).toBe(true);
  });
});

describe("buildSectionContentWrapperStyle", () => {
  it("preserves intrinsic content height when a section cannot stretch content", () => {
    expect(
      buildSectionContentWrapperStyle({
        sectionHasExplicitHeight: false,
        elementCount: 1,
      })
    ).toMatchObject({
      minHeight: "min-content",
    });
  });

  it("keeps zero min-height for stretch wrappers", () => {
    expect(
      buildSectionContentWrapperStyle({
        sectionHasExplicitHeight: true,
        elementCount: 1,
      })
    ).toMatchObject({
      flex: "1 1 0",
      minHeight: 0,
    });

    expect(
      buildSectionContentWrapperStyle({
        resolvedContentHeight: "full",
        elementCount: 1,
      })
    ).toMatchObject({
      flex: "1 1 0",
      minHeight: 0,
    });
  });
});
