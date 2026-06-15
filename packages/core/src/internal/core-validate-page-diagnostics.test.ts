import { describe, expect, it } from "vitest";
import { validatePage } from "../validate";

describe("@pb/core validatePage diagnostics", () => {
  it("returns stable diagnostic codes for invalid fixtures", () => {
    const result = validatePage({});

    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.code).toBe("PB_VALIDATION_ERROR");
    expect(result.diagnostics.every((diagnostic) => typeof diagnostic.code === "string")).toBe(
      true
    );
  });
});
