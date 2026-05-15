import { describe, expect, it } from "vitest";
import { isBgBlockShape } from "./peblor-blocks";

describe("peblor-blocks", () => {
  describe("isBgBlockShape", () => {
    it("accepts all supported background block types, including backgroundTransition", () => {
      expect(isBgBlockShape({ type: "backgroundVideo", video: "work/video.mp4" })).toBe(true);
      expect(isBgBlockShape({ type: "backgroundImage", image: "work/image.webp" })).toBe(true);
      expect(isBgBlockShape({ type: "backgroundVariable", layers: [] })).toBe(true);
      expect(isBgBlockShape({ type: "backgroundPattern", image: "work/pattern.webp" })).toBe(true);
      expect(
        isBgBlockShape({
          type: "backgroundTransition",
          from: { type: "backgroundImage", image: "work/from.webp" },
          to: { type: "backgroundImage", image: "work/to.webp" },
        })
      ).toBe(true);
    });

    it("rejects unknown or legacy-only background shapes", () => {
      expect(isBgBlockShape({ type: "backgroundColor" })).toBe(false);
      expect(isBgBlockShape({ type: "unknownBg" })).toBe(false);
      expect(isBgBlockShape({})).toBe(false);
      expect(isBgBlockShape(null)).toBe(false);
    });
  });
});
