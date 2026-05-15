import {
  buildImageMotionTimingFromAnimationDefaults,
  type PbImageAnimationDefaults,
} from "@/app/theme/pb-builder-defaults";
import {
  MOTION_DEFAULTS,
  getEntranceMotionFromPreset,
  getExitMotionFromPreset,
} from "@pb/contracts";
import type { MotionPropsFromJson } from "@pb/contracts";

function readTransition(source: unknown): MotionPropsFromJson["transition"] | undefined {
  if (!source || typeof source !== "object") return undefined;
  const record = source as Record<string, unknown>;
  if (!record.transition || typeof record.transition !== "object") return undefined;
  return record.transition as MotionPropsFromJson["transition"];
}

function buildFallbackEntranceMotion(
  preset: string | undefined,
  transition: MotionPropsFromJson["transition"] | undefined
): MotionPropsFromJson {
  const transitionRecord = transition as Record<string, unknown> | undefined;
  return getEntranceMotionFromPreset(preset ?? "fade", {
    distancePx: MOTION_DEFAULTS.defaultSlideDistancePx,
    duration: Number(transitionRecord?.duration) || MOTION_DEFAULTS.transition.duration,
    delay: Number(transitionRecord?.delay) || MOTION_DEFAULTS.transition.delay,
    ease:
      (transitionRecord?.ease as string | [number, number, number, number] | undefined) ??
      MOTION_DEFAULTS.easeTuple,
  });
}

function buildBaseMotion(timing: ReturnType<typeof buildImageMotionTimingFromAnimationDefaults>) {
  const entranceMotion = timing.entranceMotion as Record<string, unknown> | undefined;
  const entranceTransition = readTransition(entranceMotion);
  if (entranceMotion && (entranceMotion.initial != null || entranceMotion.animate != null)) {
    return {
      ...(entranceTransition ? { transition: entranceTransition } : {}),
      ...(entranceMotion as MotionPropsFromJson),
    } as MotionPropsFromJson;
  }
  return buildFallbackEntranceMotion(timing.entrancePreset, entranceTransition);
}

function buildCustomExit(
  timing: ReturnType<typeof buildImageMotionTimingFromAnimationDefaults>,
  baseMotion: MotionPropsFromJson
): MotionPropsFromJson | null {
  const exitMotion = timing.exitMotion as
    | { exit?: Record<string, unknown>; transition?: unknown }
    | undefined;
  if (!exitMotion?.exit || typeof exitMotion.exit !== "object") return null;
  const exitTransition = readTransition(exitMotion);
  return {
    ...baseMotion,
    ...(exitTransition ? { transition: exitTransition } : {}),
    exit: exitMotion.exit as Record<string, string | number | number[]>,
  };
}

function buildPresetExit(
  timing: ReturnType<typeof buildImageMotionTimingFromAnimationDefaults>,
  baseMotion: MotionPropsFromJson
): MotionPropsFromJson | null {
  if (typeof timing.exitPreset !== "string" || timing.exitPreset.trim().length === 0) return null;
  const exitMotion = timing.exitMotion as Record<string, unknown> | undefined;
  const exitTransition = readTransition(exitMotion) as Record<string, unknown> | undefined;
  const fromPreset = getExitMotionFromPreset(timing.exitPreset, {
    duration: exitTransition?.duration as number | undefined,
    delay: exitTransition?.delay as number | undefined,
    ease: exitTransition?.ease as string | [number, number, number, number] | undefined,
  });
  return {
    ...baseMotion,
    ...(fromPreset.transition
      ? { transition: fromPreset.transition as MotionPropsFromJson["transition"] }
      : {}),
    exit: fromPreset.exit as Record<string, string | number | number[]>,
  };
}

export function buildPreviewMotion(animation: PbImageAnimationDefaults): MotionPropsFromJson {
  const timing = buildImageMotionTimingFromAnimationDefaults(animation);
  const baseMotion = buildBaseMotion(timing);
  return buildCustomExit(timing, baseMotion) ?? buildPresetExit(timing, baseMotion) ?? baseMotion;
}

export function getLoopIntervalMs(animation: PbImageAnimationDefaults): number {
  const fineTune = animation.fineTune;
  const inDuration =
    fineTune.entranceBehavior === "preset"
      ? (animation.presetEntranceDuration ?? MOTION_DEFAULTS.transition.duration)
      : fineTune.entranceBehavior === "hybrid"
        ? fineTune.hybridEntranceDuration
        : fineTune.entrance.duration;
  const outDuration =
    fineTune.exitBehavior === "preset"
      ? (animation.presetExitDuration ?? MOTION_DEFAULTS.transition.exitDuration)
      : fineTune.exitBehavior === "hybrid"
        ? fineTune.hybridExitDuration
        : fineTune.exit.duration;
  return Math.max(1800, Math.round((inDuration + outDuration + 1.2) * 1000));
}
