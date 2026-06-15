import type { CSSProperties } from "react";
import type { BackgroundTransitionEffect } from "@pb/contracts/types";
import type {
  ScrollBackgroundTransitionEffect,
  TriggerBackgroundTransitionEffect,
  TimeBackgroundTransitionEffect,
} from "./background-transition-effect-types";

export function getInitialScrollProgress(effect: BackgroundTransitionEffect): number {
  if (effect.type !== "SCROLL") return 0;
  return (effect as ScrollBackgroundTransitionEffect).progress ?? 0;
}

export function getTransitionMode(effect: BackgroundTransitionEffect): "progress" | "time" {
  return effect.type === "SCROLL" ? "progress" : "time";
}

export function getScrollProgressValue(
  effect: BackgroundTransitionEffect,
  localProgress: number
): number {
  if (effect.type !== "SCROLL") return localProgress;
  return (effect as ScrollBackgroundTransitionEffect).progress ?? localProgress;
}

export function mapScrollProgress(
  effect: BackgroundTransitionEffect,
  scrollProgress: number
): number {
  if (effect.type !== "SCROLL") return 0;
  const scrollEffect = effect as ScrollBackgroundTransitionEffect;
  const rawProgress = Math.max(0, Math.min(1, scrollProgress));

  if (!scrollEffect.progressRange) return rawProgress;
  const { start, end } = scrollEffect.progressRange;
  if (rawProgress <= start) return 0;
  if (rawProgress >= end) return 1;
  const range = end - start;
  return range > 0 ? (rawProgress - start) / range : 0;
}

export function resolveEffectiveTransitionProgress(args: {
  effect: BackgroundTransitionEffect;
  transitionMode: "progress" | "time";
  mappedProgress: number;
  transitionStarted: boolean;
  isForward: boolean;
  currentTriggerProgress: number;
}): number {
  const {
    effect,
    transitionMode,
    mappedProgress,
    transitionStarted,
    isForward,
    currentTriggerProgress,
  } = args;
  if (transitionMode === "progress") return mappedProgress;
  if (effect.type === "TIME") return transitionStarted ? 1 : 0;
  if (!transitionStarted) return currentTriggerProgress;
  return isForward ? 1 : 0;
}

/**
 * Clamp a value to the [0, 1] unit range with finite guard.
 * NOTE: If you only need the basic clamp(value, 0, 1) pattern without the
 * finite guard, consider using `clamp` from Shared/css-declaration-utils instead.
 */
export function clampUnitProgress(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function resolveCrossfadeOpacities(progress: number): {
  fromOpacity: number;
  toOpacity: number;
} {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return { fromOpacity: 1 - p, toOpacity: p };
}

export function buildOpacityTransitionStyle(
  effect: BackgroundTransitionEffect,
  transitionMode: "progress" | "time"
): CSSProperties {
  if (transitionMode === "progress") return {};

  let duration: number | undefined;
  let easing: string | undefined;
  if (effect.type === "TIME") {
    const timeEffect = effect as TimeBackgroundTransitionEffect;
    duration = timeEffect.duration;
    easing = timeEffect.easing;
  } else if (effect.type === "TRIGGER") {
    const triggerEffect = effect as TriggerBackgroundTransitionEffect;
    duration = triggerEffect.duration;
    easing = triggerEffect.easing;
  }

  if (!duration) return {};
  return { transition: `opacity ${duration}ms ${easing ?? "ease-in-out"}` };
}
