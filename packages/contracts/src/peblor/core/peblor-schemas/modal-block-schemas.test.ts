import { describe, expect, it } from "vitest";
import { modalBuilderSchema } from "./modal-block-schemas";

describe("modalBuilderSchema", () => {
  it("accepts modal definitions with section-order + definitions", () => {
    const result = modalBuilderSchema.safeParse({
      id: "signup-modal",
      title: "Sign up",
      sectionOrder: ["hero"],
      definitions: {
        hero: {
          type: "contentBlock",
          gap: "1rem",
          elements: [],
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid definition blocks", () => {
    const result = modalBuilderSchema.safeParse({
      id: "broken-modal",
      sectionOrder: ["hero"],
      definitions: {
        hero: { foo: "bar" },
      },
    });
    expect(result.success).toBe(false);
  });
});
