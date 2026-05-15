import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getDefaultStyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";
import {
  BreakpointThresholdsPanel,
  type LayoutSectionsSlices,
  SectionPreviewPanel,
} from "./LayoutSectionsPanels";

function createSlices(): LayoutSectionsSlices {
  const style = getDefaultStyleToolPersistedV3();
  return {
    breakpoints: style.breakpoints,
    contentWidths: style.contentWidths,
    sectionMarginScale: style.sectionMarginScale,
    sectionMarginScaleLocks: style.sectionMarginScaleLocks,
  };
}

describe("LayoutSectionsPanels", () => {
  it("keeps breakpoint controls simplified to mobile threshold input", () => {
    const markup = renderToStaticMarkup(
      <BreakpointThresholdsPanel
        slices={createSlices()}
        setSlices={() => {
          // noop
        }}
      />
    );
    expect(markup).toContain("Mobile max (px)");
    expect(markup).not.toContain("Advanced desktop override");
  });

  it("renders both width and margin preview groups", () => {
    const markup = renderToStaticMarkup(
      <SectionPreviewPanel
        slices={createSlices()}
        previewBreakpoint="desktop"
        setPreviewBreakpoint={() => {}}
      />
    );
    expect(markup).toContain("Content width");
    expect(markup).toContain("Section margin rhythm");
  });
});
