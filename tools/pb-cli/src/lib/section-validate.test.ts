import { describe, expect, it } from "vitest";
import { validateSectionValue } from "./section-validate.js";

describe("validateSectionValue", () => {
  it("accepts a valid divider section (authored shape)", () => {
    const result = validateSectionValue({ type: "divider" });
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("accepts a valid contentBlock in authored shape (elementOrder + definitions)", () => {
    const result = validateSectionValue({
      type: "contentBlock",
      elementOrder: ["hero-title"],
      definitions: {
        "hero-title": { type: "elementHeading", text: "Hello" },
      },
    });
    // peblorDefinitionBlockSchema accepts authored shape
    expect(result.valid).toBe(true);
  });

  it("rejects an invalid section type", () => {
    const result = validateSectionValue({ type: "notARealType", elementOrder: [] });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics.some((d) => d.code === "PB_SECTION_INVALID")).toBe(true);
  });

  it("adds explicit bgKey page-only guidance", () => {
    const result = validateSectionValue({
      type: "divider",
      bgKey: "bg-home",
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "PB_SECTION_PAGE_ONLY_FIELD",
        path: "$.bgKey",
      })
    );
  });

  it("rejects sectionOrder field (page-only)", () => {
    const result = validateSectionValue({
      type: "divider",
      sectionOrder: ["section-a"],
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "PB_SECTION_PAGE_ONLY_FIELD",
        path: "$.sectionOrder",
      })
    );
  });

  it("uses peblorDefinitionBlockSchema as the schema name", () => {
    const result = validateSectionValue({ type: "divider" });
    expect(result.schema).toBe("peblorDefinitionBlockSchema");
  });
});
