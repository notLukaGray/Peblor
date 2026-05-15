import { beforeAll, describe, expect, it, vi } from "vitest";
import { readElementDimensions, withGlassPhysicsClamped } from "./glass-effect-utils";
import { calculateDisplacementMap2 } from "./lib/displacement-map";
import { sampleRoundedRectBezel } from "./lib/rounded-rect-bezel";

class TestImageData {
  readonly colorSpace = "srgb";
  readonly data: Uint8ClampedArray;
  readonly height: number;
  readonly width: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

describe("glass corner radii", () => {
  beforeAll(() => {
    vi.stubGlobal("ImageData", TestImageData);
  });

  it("reads asymmetric border-radius values from computed styles", () => {
    const el = document.createElement("div");
    el.style.width = "120px";
    el.style.height = "80px";
    el.style.borderRadius = "30px 30px 0 0";
    document.body.appendChild(el);

    const dims = readElementDimensions(el);
    el.remove();

    expect(dims.cornerRadii).toEqual({
      topLeft: 30,
      topRight: 30,
      bottomRight: 0,
      bottomLeft: 0,
    });
    expect(dims.radius).toBe(30);
  });

  it("keeps independent corners when clamping oversized radii", () => {
    const dims = withGlassPhysicsClamped({
      width: 100,
      height: 60,
      radius: 80,
      cornerRadii: {
        topLeft: 80,
        topRight: 80,
        bottomRight: 0,
        bottomLeft: 0,
      },
    });

    expect(dims.cornerRadii.bottomLeft).toBe(0);
    expect(dims.cornerRadii.bottomRight).toBe(0);
    expect(dims.cornerRadii.topLeft).toBeGreaterThan(0);
    expect(dims.cornerRadii.topRight).toBeGreaterThan(0);
    expect(dims.radius).toBe(Math.max(...Object.values(dims.cornerRadii)));
  });

  it("samples square bottom corners for top-only radii", () => {
    const radii = {
      topLeft: 30,
      topRight: 30,
      bottomRight: 0,
      bottomLeft: 0,
    };

    const squareBottomSample = sampleRoundedRectBezel(5, 99, 100, 100, radii, 6);
    const uniformRoundedSample = sampleRoundedRectBezel(5, 99, 100, 100, 30, 6);

    expect(squareBottomSample).not.toBeNull();
    expect(squareBottomSample?.normalY).toBeGreaterThan(0);
    expect(uniformRoundedSample).toBeNull();
  });

  it("writes displacement on zero-radius bottom edges", () => {
    const imageData = calculateDisplacementMap2(
      100,
      100,
      100,
      100,
      {
        topLeft: 30,
        topRight: 30,
        bottomRight: 0,
        bottomLeft: 0,
      },
      6,
      1,
      Array.from({ length: 8 }, () => 1),
      1
    );

    const bottomLeftEdge = (99 * 100 + 5) * 4;
    expect(imageData.data[bottomLeftEdge]).toBe(128);
    expect(imageData.data[bottomLeftEdge + 1]).toBeLessThan(128);
  });
});
