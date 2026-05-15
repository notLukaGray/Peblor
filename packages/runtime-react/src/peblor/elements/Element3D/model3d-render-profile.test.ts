import { describe, expect, it } from "vitest";
import { resolveModel3DRenderProfile } from "./model3d-render-profile";

describe("resolveModel3DRenderProfile", () => {
  it("uses conservative homepage defaults on mobile", () => {
    expect(
      resolveModel3DRenderProfile({
        isMobile: true,
        isHomepagePriority: true,
      })
    ).toEqual({
      dpr: [1, 1],
      gl: {
        antialias: false,
        powerPreference: "low-power",
        alpha: true,
      },
    });
  });

  it("uses homepage desktop DPR cap without disabling antialias", () => {
    expect(
      resolveModel3DRenderProfile({
        isMobile: false,
        isHomepagePriority: true,
      })
    ).toEqual({
      dpr: [1, 1.25],
      gl: {
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
      },
    });
  });

  it("respects explicit canvas overrides", () => {
    expect(
      resolveModel3DRenderProfile({
        isMobile: true,
        isHomepagePriority: true,
        canvas: {
          dpr: 1.75,
          gl: {
            antialias: true,
            powerPreference: "default",
            alpha: false,
          },
        },
      })
    ).toEqual({
      dpr: [1, 1],
      gl: {
        antialias: true,
        powerPreference: "default",
        alpha: false,
      },
    });
  });
});
