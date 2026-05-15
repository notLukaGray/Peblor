import { describe, expect, it } from "vitest";
import { z } from "zod";
import { baseSectionPropsSchema } from "./section-block-base-schemas";

describe("section cursor (SCHEMA-3)", () => {
  const cursorOnly = z.object({ cursor: baseSectionPropsSchema.shape.cursor });

  it("rejects invalid cursor strings", () => {
    expect(cursorOnly.safeParse({ cursor: "not-a-real-cursor" }).success).toBe(false);
  });

  it("treats null cursor like omitted (SCHEMA-2)", () => {
    expect(cursorOnly.safeParse({ cursor: null }).success).toBe(true);
  });

  it("accepts valid cursor values", () => {
    expect(cursorOnly.safeParse({ cursor: "pointer" }).success).toBe(true);
  });
});

describe("base section JSON null coercion (SCHEMA-2)", () => {
  it("accepts null for optional string fields", () => {
    const slice = baseSectionPropsSchema.pick({ id: true, boxShadow: true, ariaLabel: true });
    expect(slice.safeParse({ id: null, boxShadow: null, ariaLabel: null }).success).toBe(true);
  });
});
