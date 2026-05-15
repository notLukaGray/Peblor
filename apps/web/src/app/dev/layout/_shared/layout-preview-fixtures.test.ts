import { describe, expect, it } from "vitest";
import { getDefaultStyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";
import {
  buildPageLayerPreviewSections,
  buildSectionMarginPreviewSections,
  buildSectionWidthPreviewSections,
} from "./layout-preview-fixtures";

function toTextValues(section: { elements?: unknown[] }): string[] {
  if (!Array.isArray(section.elements)) return [];
  return section.elements
    .map((element) =>
      typeof element === "object" && element !== null && "text" in element
        ? (element as { text?: unknown }).text
        : null
    )
    .filter((value): value is string => typeof value === "string");
}

describe("layout-preview-fixtures", () => {
  it("keeps all section width rails visible in fixtures", () => {
    const sections = buildSectionWidthPreviewSections();
    expect(sections.map((section) => section.id)).toEqual([
      "layout-section-preview-narrow",
      "layout-section-preview-standard",
      "layout-section-preview-wide",
      "layout-section-preview-full",
    ]);
    expect(sections.map((section) => section.contentWidth)).toEqual([
      "var(--pb-width-narrow)",
      "var(--pb-width-standard)",
      "var(--pb-width-wide)",
      "var(--pb-width-full)",
    ]);
  });

  it("keeps margin fixture tokens in order", () => {
    const sections = buildSectionMarginPreviewSections();
    expect(sections.map((section) => section.id)).toEqual([
      "layout-section-margin-none",
      "layout-section-margin-xs",
      "layout-section-margin-sm",
      "layout-section-margin-md",
      "layout-section-margin-lg",
      "layout-section-margin-xl",
    ]);
    expect(sections[0]?.marginTop).toBe("0px");
    expect(sections[5]?.marginTop).toBe("var(--pb-section-margin-xl)");
  });

  it("builds compact page layer labels with staggered vertical offsets", () => {
    const style = getDefaultStyleToolPersistedV3();
    const sections = buildPageLayerPreviewSections({
      zIndexLayers: style.zIndexLayers,
      opacityScale: style.opacityScale,
    });

    const ys = sections.map((section) =>
      Number.parseFloat(String(section.initialY ?? "0").replace("%", ""))
    );
    expect(ys).toEqual([...ys].sort((a, b) => a - b));

    const modalSection = sections.find((section) => section.id?.includes("modal"));
    expect(modalSection).toBeDefined();
    const modalCopy = toTextValues(modalSection ?? {}).join(" ");
    expect(modalCopy).toContain("Modal layer");
    expect(modalCopy).toMatch(/z-index/);
  });
});
