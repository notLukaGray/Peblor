import { describe, expect, it } from "vitest";
import { validateSectionValue } from "./section-validate.js";

describe("validateSectionValue", () => {
  it("surfaces deep action payload paths for invalid trigger actions", () => {
    const result = validateSectionValue({
      type: "contentBlock",
      elements: [],
      cursorTriggers: [
        {
          axis: "x",
          action: { type: "setVariable", key: "foo", value: "bar" },
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes("cursorTriggers.0.action.payload"))).toBe(
      true
    );
  });

  it("adds explicit bgKey page-only guidance", () => {
    const result = validateSectionValue({
      type: "divider",
      bgKey: "bg-home",
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "PB_SECTION_PAGE_ONLY_FIELD",
        path: "$.bgKey",
      })
    );
  });
});
