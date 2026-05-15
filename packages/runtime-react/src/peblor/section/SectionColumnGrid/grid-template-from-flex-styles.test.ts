import { describe, expect, it } from "vitest";
import { gridTemplateFromFlexStyles } from "./section-column-grid-rendering";

describe("gridTemplateFromFlexStyles", () => {
  it("maps hug columns to max-content for flex-row style grids", () => {
    const hug = { flex: "0 0 auto" as const };
    expect(gridTemplateFromFlexStyles([hug, hug, hug])).toBe("max-content max-content max-content");
  });

  it("maps hug columns to fr tracks for CSS Grid so multi-column layout works", () => {
    const hug = { flex: "0 0 auto" as const };
    expect(gridTemplateFromFlexStyles([hug, hug, hug], { forCssGrid: true })).toBe(
      "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)"
    );
  });
});
