import { describe, expect, it } from "vitest";
import { elementHeadingSchema } from "./element-content-schemas";
import { elementLayoutSchemaBase } from "./element-foundation-schemas";

describe("elementLayoutSchemaBase state style fields (gap 1.4)", () => {
  it("parses hoverStyle as a CSS property bag on a generic element", () => {
    const result = elementLayoutSchemaBase.safeParse({
      hoverStyle: { opacity: 0.8 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hoverStyle).toEqual({ opacity: 0.8 });
    }
  });

  it("parses all five state style fields together", () => {
    const result = elementLayoutSchemaBase.safeParse({
      hoverStyle: { opacity: 0.8, transform: "scale(1.02)" },
      focusStyle: { outline: "2px solid blue" },
      focusVisibleStyle: { outline: "3px solid blue", outlineOffset: "2px" },
      activeStyle: { transform: "scale(0.98)" },
      disabledStyle: { opacity: 0.4, pointerEvents: "none" },
    });
    expect(result.success).toBe(true);
  });

  it("parses state style fields on a concrete element type (elementHeading)", () => {
    const result = elementHeadingSchema.safeParse({
      type: "elementHeading",
      text: "Hello",
      hoverStyle: { color: "var(--accent)" },
      focusVisibleStyle: { outline: "2px solid currentColor", outlineOffset: "4px" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hoverStyle).toEqual({ color: "var(--accent)" });
      expect(result.data.focusVisibleStyle).toEqual({
        outline: "2px solid currentColor",
        outlineOffset: "4px",
      });
    }
  });

  it("omits state style fields when not provided (all optional)", () => {
    const result = elementLayoutSchemaBase.safeParse({ width: "100%" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hoverStyle).toBeUndefined();
      expect(result.data.focusStyle).toBeUndefined();
      expect(result.data.focusVisibleStyle).toBeUndefined();
      expect(result.data.activeStyle).toBeUndefined();
      expect(result.data.disabledStyle).toBeUndefined();
    }
  });

  it("accepts null values for state style fields (jsonNullishOptional)", () => {
    const result = elementLayoutSchemaBase.safeParse({
      hoverStyle: null,
      focusStyle: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hoverStyle).toBeUndefined();
      expect(result.data.focusStyle).toBeUndefined();
    }
  });

  it("accepts numeric CSS values in state style objects", () => {
    const result = elementLayoutSchemaBase.safeParse({
      hoverStyle: { opacity: 0.5, zIndex: 10 },
    });
    expect(result.success).toBe(true);
  });
});
