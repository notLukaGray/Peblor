import { describe, expect, it } from "vitest";
import { validateBgValue } from "./bg-validate.js";

describe("validateBgValue", () => {
  it("accepts a minimal background image", () => {
    const result = validateBgValue({ type: "backgroundImage", image: "/hero.jpg" });
    expect(result.valid).toBe(true);
  });

  it("returns diagnostics for malformed transition", () => {
    const result = validateBgValue({ type: "backgroundTransition", mode: "time" });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});
