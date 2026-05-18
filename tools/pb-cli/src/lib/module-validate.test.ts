import { describe, expect, it } from "vitest";
import { validateModuleValue } from "./module-validate.js";

describe("validateModuleValue", () => {
  it("accepts a minimal module block", () => {
    const result = validateModuleValue({
      type: "module",
      contentSlot: "content",
      slots: {},
    });
    expect(result.valid).toBe(true);
  });

  it("returns diagnostics for missing required fields", () => {
    const result = validateModuleValue({ type: "module" });
    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some((d) => d.path.includes("contentSlot") || d.path.includes("slots"))
    ).toBe(true);
  });
});
