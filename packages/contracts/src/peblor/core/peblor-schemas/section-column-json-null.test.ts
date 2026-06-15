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

  it("treats null base count like omitted in responsive column count", () => {
    expect(columnCountSchema.safeParse({ base: null, md: 2 }).success).toBe(true);
  });

  it("accepts null elementOrder base array entry wrapper", () => {
    expect(
      elementOrderSchema.safeParse({
        base: null,
        md: ["a", "b"],
      }).success
    ).toBe(true);
  });
});
