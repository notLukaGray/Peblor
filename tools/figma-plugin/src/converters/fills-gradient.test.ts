import { describe, expect, it } from "vitest";
import { extractGradientFill } from "./fills-gradient";

function makeRadialPaint(transform: Transform): GradientPaint {
  return {
    type: "GRADIENT_RADIAL",
    visible: true,
    gradientTransform: transform,
    gradientStops: [
      { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
      { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
    ],
  } as GradientPaint;
}

describe("fills-gradient radial export", () => {
  it("exports radial gradients as ellipse with radii percentages", () => {
    const css = extractGradientFill(
      [
        makeRadialPaint([
          [2, 0, 0],
          [0, 4, 0],
        ] as Transform),
      ],
      { width: 400, height: 200 }
    );

    expect(css).toContain("radial-gradient(25% 12.5% at 25% 12.5%");
  });

  it("uses helper-compatible inverse transform basis for center coordinates", () => {
    const css = extractGradientFill(
      [
        makeRadialPaint([
          [1, 0, 0.2],
          [0, 1, 0.3],
        ] as Transform),
      ],
      { width: 400, height: 200 }
    );

    expect(css).toContain("at 30% 20%");
  });

  it("supports angular gradients as conic-gradient", () => {
    const css = extractGradientFill(
      [
        {
          type: "GRADIENT_ANGULAR",
          visible: true,
          gradientTransform: [
            [1, 0, 0],
            [0, 1, 0],
          ] as Transform,
          gradientStops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
          ],
        } as GradientPaint,
      ],
      { width: 200, height: 100 }
    );
    expect(css).toContain("conic-gradient(");
  });

  it("skips invisible gradients and uses first visible one", () => {
    const css = extractGradientFill(
      [
        {
          ...makeRadialPaint([
            [1, 0, 0],
            [0, 1, 0],
          ] as Transform),
          visible: false,
        } as GradientPaint,
        makeRadialPaint([
          [1, 0, 0],
          [0, 1, 0],
        ] as Transform),
      ],
      { width: 100, height: 100 }
    );
    expect(css).toContain("radial-gradient(");
  });
});
