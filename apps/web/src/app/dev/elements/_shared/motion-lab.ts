import type {
  PbImageAnimationCurvePreset,
  PbImageAnimationDirection,
  PbImageAnimationFineTune,
  PbImageHybridStackPreset,
} from "@/app/theme/pb-builder-defaults";

export type AnimationBehavior = "preset" | "hybrid" | "custom";

export const MOTION_DIRECTION_OPTIONS: PbImageAnimationDirection[] = [
  "none",
  "up",
  "down",
  "left",
  "right",
];

export const MOTION_CURVE_PRESET_OPTIONS: PbImageAnimationCurvePreset[] = [
  "easeOut",
  "easeInOut",
  "easeIn",
  "linear",
  "customBezier",
];

export const MOTION_HYBRID_STACK_OPTIONS: PbImageHybridStackPreset[] = [
  "none",
  "zoomIn",
  "zoomOut",
  "tiltIn",
];

export const MOTION_CUSTOM_FIELD_KEYS = [
  "opacity",
  "x",
  "y",
  "scale",
  "rotate",
  "duration",
  "delay",
  "ease/curve",
  "trigger",
] as const;

/** Coarse lab mode for badges / overlays when sides differ (custom > hybrid > preset). */
export function getAnimationBehavior(fineTune: PbImageAnimationFineTune): AnimationBehavior {
  if (fineTune.entranceBehavior === "custom" || fineTune.exitBehavior === "custom") {
    return "custom";
  }
  if (fineTune.entranceBehavior === "hybrid" || fineTune.exitBehavior === "hybrid") {
    return "hybrid";
  }
  return "preset";
}
