import { describe, expect, it } from "vitest";
import type { MotionValue } from "./types";
import { buildMotionSectionStyle } from "./section-motion-wrapper";

describe("buildMotionSectionStyle", () => {
  it("keeps static transforms while binding parallax as a MotionValue", () => {
    const parallaxY = { get: () => 24 } as MotionValue<number>;

    const result = buildMotionSectionStyle(
      {
        transform: "translateX(-50%)",
        opacity: 0.4,
      },
      parallaxY
    );

    expect(result.style).toMatchObject({
      opacity: 0.4,
      y: parallaxY,
    });
    expect(result.style).not.toHaveProperty("transform");
    expect(result.transformTemplate?.({}, "translateY(24px)")).toBe(
      "translateX(-50%) translateY(24px)"
    );
  });

  it("passes plain section styles through when parallax is disabled", () => {
    const style = {
      transform: "translateX(-50%)",
      opacity: 0.4,
    };

    expect(buildMotionSectionStyle(style)).toEqual({ style });
  });
});
