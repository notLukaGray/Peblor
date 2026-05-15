"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackgroundTransitionEffectLayers } from "./BackgroundTransitionEffectLayers";
import {
  buildOpacityTransitionStyle,
  clampUnitProgress,
  getInitialScrollProgress,
  getScrollProgressValue,
  getTransitionMode,
  mapScrollProgress,
  resolveCrossfadeOpacities,
  resolveEffectiveTransitionProgress,
} from "./background-transition-effect-progress";
import {
  useBackgroundTransitionProgressListener,
  useBackgroundTransitionStartListener,
} from "./background-transition-effect-event-listeners";
import type {
  BackgroundTransitionEffectProps,
  TriggerBackgroundTransitionEffect,
} from "./background-transition-effect-types";

export function BackgroundTransitionEffect({
  effect,
  fromBg,
  toBg,
  transitionId,
  isReversing = false,
  onReverseComplete,
}: BackgroundTransitionEffectProps) {
  const [isForward, setIsForward] = useState(true);
  const [transitionStarted, setTransitionStarted] = useState(effect.type === "TIME");
  const [progress, setProgress] = useState(() => getInitialScrollProgress(effect));
  const [currentTriggerProgress, setCurrentTriggerProgress] = useState(0);
  const reverseCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressRef = useRef<number | null>(null);

  const scrollProgress = getScrollProgressValue(effect, progress);
  const transitionMode = useMemo(() => getTransitionMode(effect), [effect]);

  useBackgroundTransitionStartListener({
    effect,
    transitionId,
    isForward,
    transitionStarted,
    reverseCompleteTimeoutRef,
    setIsForward,
    setTransitionStarted,
    setCurrentTriggerProgress,
  });

  useBackgroundTransitionProgressListener({
    effect,
    transitionId,
    lastProgressRef,
    setProgress,
  });

  const mappedProgress = useMemo(
    () => mapScrollProgress(effect, scrollProgress),
    [effect, scrollProgress]
  );

  const effectiveProgress = useMemo(
    () =>
      resolveEffectiveTransitionProgress({
        effect,
        transitionMode,
        mappedProgress,
        transitionStarted,
        isForward,
        currentTriggerProgress,
      }),
    [effect, transitionMode, mappedProgress, transitionStarted, isForward, currentTriggerProgress]
  );

  useEffect(() => {
    if (effect.type !== "TRIGGER" || !isReversing || !onReverseComplete) return;
    if (!transitionStarted || isForward) return;

    const triggerEffect = effect as TriggerBackgroundTransitionEffect;
    const duration = triggerEffect.duration ?? 0;
    if (duration <= 0) return;

    reverseCompleteTimeoutRef.current = setTimeout(() => {
      onReverseComplete();
      reverseCompleteTimeoutRef.current = null;
    }, duration);

    return () => {
      if (reverseCompleteTimeoutRef.current) clearTimeout(reverseCompleteTimeoutRef.current);
    };
  }, [effect, isReversing, transitionStarted, isForward, onReverseComplete]);

  const clampedProgress = clampUnitProgress(effectiveProgress);
  const { fromOpacity, toOpacity } = resolveCrossfadeOpacities(clampedProgress);
  const transitionStyle = useMemo(
    () => buildOpacityTransitionStyle(effect, transitionMode),
    [effect, transitionMode]
  );

  return (
    <BackgroundTransitionEffectLayers
      fromBg={fromBg}
      toBg={toBg}
      fromOpacity={fromOpacity}
      toOpacity={toOpacity}
      transitionStyle={transitionStyle}
    />
  );
}
