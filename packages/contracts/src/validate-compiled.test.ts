import { describe, expect, it } from "vitest";
import { validatePageWithAjv } from "./validate-compiled";

describe("validatePageWithAjv", () => {
  it(
    "reconciles with Zod when AJV misses a refinement (SCROLL progressRange order)",
    { timeout: 30000 },
    () => {
      const invalidPage = {
        title: "x",
        definitions: {},
        sectionOrder: [],
        transitions: {
          type: "SCROLL",
          id: "t1",
          from: "a",
          to: "b",
          progressRange: { start: 0.8, end: 0.2 },
        },
      };
      const result = validatePageWithAjv(invalidPage);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.errors.some((e) => e.includes("progressRange.start must be less than"))).toBe(
        true
      );
    }
  );

  it("returns success for a minimal page that passes both AJV and Zod", () => {
    const page = { title: "Test Page", definitions: {}, sectionOrder: [] };
    const result = validatePageWithAjv(page);
    expect(result.success).toBe(true);
  });
});
