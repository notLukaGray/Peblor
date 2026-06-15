import { describe, expect, it } from "vitest";
import { elementListSchema } from "./element-list-schemas";

describe("elementList schema", () => {
  it("validates a minimal list with required items", () => {
    const result = elementListSchema.safeParse({
      type: "elementList",
      items: ["First item", "Second item"],
    });
    expect(result.success).toBe(true);
  });

  it("validates an ordered list", () => {
    const result = elementListSchema.safeParse({
      type: "elementList",
      items: ["Step one", "Step two", "Step three"],
      ordered: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates a list with markerStyle and start", () => {
    const result = elementListSchema.safeParse({
      type: "elementList",
      items: ["Alpha", "Beta", "Gamma"],
      ordered: true,
      markerStyle: "decimal",
      start: 3,
    });
    expect(result.success).toBe(true);
  });

  it("validates a list with layout and typography overrides", () => {
    const result = elementListSchema.safeParse({
      type: "elementList",
      items: ["One", "Two"],
      markerStyle: "disc",
      fontSize: "1rem",
      lineHeight: 1.6,
      width: "100%",
    });
    expect(result.success).toBe(true);
  });

  it("validates an empty items array", () => {
    const result = elementListSchema.safeParse({
      type: "elementList",
      items: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects when items is missing", () => {
    const result = elementListSchema.safeParse({
      type: "elementList",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when items is not an array", () => {
    const result = elementListSchema.safeParse({
      type: "elementList",
      items: "not an array",
    });
    expect(result.success).toBe(false);
  });
});
