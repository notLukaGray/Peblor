import { describe, expect, it } from "vitest";
import { itemStylesSchema } from "./section-column-layout-schemas";

/**
 * C-itemStyles-union-order guard.
 *
 * The `itemStylesSchema` union must test the responsive tier-map branch BEFORE the
 * flat `Record<string, itemStyleSchema>` branch. If the order were reversed,
 * a `{ base: {...}, md: {...} }` object would be parsed as a flat record whose
 * "element-id" keys happen to be "base" and "md", stripping every nested override
 * down to an empty object `{}` (silent data loss).
 *
 * This test asserts that a `{ base, md }` object round-trips through `.parse()`
 * with its nested overrides intact.
 */
describe("itemStylesSchema union order (C-itemStyles-union-order)", () => {
  it("round-trips a responsive { base, md } itemStyles object without stripping overrides", () => {
    const input = {
      base: {
        "hero-image": { fill: "#000000", gap: "8px" },
      },
      md: {
        "hero-image": { fill: "#ffffff", gap: "16px" },
      },
    };

    const result = itemStylesSchema.parse(input);

    // Must be parsed as the responsive branch — not as a flat record keyed by "base"/"md"
    expect(result).not.toBeNull();
    expect(result).toEqual(input);
    expect((result as typeof input).base?.["hero-image"]?.fill).toBe("#000000");
    expect((result as typeof input).md?.["hero-image"]?.gap).toBe("16px");
  });

  it("also accepts a flat record itemStyles object", () => {
    const input = {
      "hero-image": { fill: "#ff0000" },
      "hero-body": { gap: "4px" },
    };

    const result = itemStylesSchema.parse(input);
    expect(result).toEqual(input);
  });
});
