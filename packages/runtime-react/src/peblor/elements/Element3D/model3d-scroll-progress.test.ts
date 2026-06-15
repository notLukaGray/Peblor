import { describe, expect, it } from "vitest";
import { computeSectionScrollProgress } from "./model3d-scroll-progress";

describe("computeSectionScrollProgress", () => {
  it("returns 0 before the section enters the viewport", () => {
    expect(
      computeSectionScrollProgress(
        {
          sectionTop: 1000,
          sectionHeight: 400,
          viewportHeight: 600,
        },
        0
      )
    ).toBe(0);
  });

  it("matches the cached container-space progress while the section is in view", () => {
    expect(
      computeSectionScrollProgress(
        {
          sectionTop: 1000,
          sectionHeight: 400,
          viewportHeight: 600,
        },
        700
      )
    ).toBeCloseTo(0.3);
  });

  it("clamps to 1 after the section fully exits the viewport", () => {
    expect(
      computeSectionScrollProgress(
        {
          sectionTop: 1000,
          sectionHeight: 400,
          viewportHeight: 600,
        },
        1400
      )
    ).toBe(1);
  });
});
