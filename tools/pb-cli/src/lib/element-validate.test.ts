import { describe, expect, it } from "vitest";
import { validateElementValue } from "./element-validate.js";

describe("validateElementValue", () => {
  it("accepts a valid minimal element", () => {
    const result = validateElementValue({
      type: "elementSpacer",
    });
    expect(result.valid).toBe(true);
  });

  it("returns deep diagnostics for invalid action nesting", () => {
    const result = validateElementValue({
      type: "elementButton",
      label: "Click",
      action: { type: "setVariable", key: "a", value: 1 },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes("action"))).toBe(true);
  });
});
