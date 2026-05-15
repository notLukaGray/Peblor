import { describe, expect, it } from "vitest";
import {
  buildPageDensityCssVars,
  scaleSpaceForDensity,
  scaleSpaceShorthandForDensity,
} from "@pb/contracts/peblor/core/page-density";

describe("page-density", () => {
  it("builds density multipliers for comfortable mode", () => {
    const vars = buildPageDensityCssVars("comfortable");
    expect(vars["--pb-density-space-multiplier"]).toBe("1.14");
    expect(vars["--pb-density-radius-multiplier"]).toBe("1.08");
  });

  it("scales single spacing values", () => {
    expect(scaleSpaceForDensity("1rem")).toBe(
      "calc((1rem) * var(--pb-density-space-multiplier, 1))"
    );
  });

  it("scales 2-value shorthands token-by-token", () => {
    expect(scaleSpaceShorthandForDensity("0.5rem 1.25rem")).toBe(
      "calc((0.5rem) * var(--pb-density-space-multiplier, 1)) calc((1.25rem) * var(--pb-density-space-multiplier, 1))"
    );
  });
});
