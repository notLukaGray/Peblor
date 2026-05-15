import type { CanvasDef } from "./model3d-types";

type RenderProfileInput = {
  canvas?: CanvasDef;
  isMobile: boolean;
  isHomepagePriority: boolean;
};

type RenderProfile = {
  dpr: [number, number];
  gl: {
    antialias: boolean;
    powerPreference: "default" | "high-performance" | "low-power";
    alpha: boolean;
  };
};

export function resolveModel3DRenderProfile({
  canvas,
  isMobile,
  isHomepagePriority,
}: RenderProfileInput): RenderProfile {
  const glOpts = canvas?.gl ?? {};
  const defaultDpr = isHomepagePriority ? (isMobile ? 1 : 1.25) : 1.5;
  const maxDpr = isHomepagePriority ? (isMobile ? 1 : 1.5) : 2;
  const requestedDpr = canvas?.dpr ?? defaultDpr;

  return {
    dpr: [1, Math.min(requestedDpr, maxDpr)],
    gl: {
      antialias: glOpts.antialias ?? !(isHomepagePriority && isMobile),
      powerPreference:
        glOpts.powerPreference ??
        (isHomepagePriority && isMobile ? "low-power" : "high-performance"),
      alpha: glOpts.alpha ?? true,
    },
  };
}
