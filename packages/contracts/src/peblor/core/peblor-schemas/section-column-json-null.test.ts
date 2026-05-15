import { describe, expect, it } from "vitest";
import {
  columnCountSchema,
  columnStyleSchema,
  elementOrderSchema,
} from "./section-column-layout-schemas";

describe("column layout JSON null (SCHEMA-2)", () => {
  it("treats null optional fields like omitted on columnStyleSchema", () => {
    expect(columnStyleSchema.safeParse({ fill: null, gap: null }).success).toBe(true);
  });

  it("treats null mobile count like omitted in responsive column count", () => {
    expect(columnCountSchema.safeParse({ mobile: null, desktop: 2 }).success).toBe(true);
  });

  it("accepts null elementOrder mobile array entry wrapper", () => {
    expect(
      elementOrderSchema.safeParse({
        mobile: null,
        desktop: ["a", "b"],
      }).success
    ).toBe(true);
  });
});
