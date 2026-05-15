"use client";

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { CSSProperties, RefObject } from "react";
import { useSectionScrollProgressFM } from "./section-scroll-progress";
import { useShouldReduceMotion } from "./reduced-motion";

export type ScrollOpacityRange = {
  /** Input progress range (0–1) where the mapping applies. Defaults to [0, 1]. */
  input?: [number, number];
  /** Output opacity range (0–1). Defaults to [0, 1]. */
  output?: [number, number];
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export type UseSectionScrollOpacityStyleOptions = {
  /** When false, ignore system reduced-motion preference (e.g. section has reduceMotion: false). */
  respectReducedMotion?: boolean;
};

/**
 * Maps section scroll progress (0–1) to an opacity style using useSectionScrollProgressFM.
 * Returns a CSSProperties fragment that can be merged into section style.
 * When scroll-driven, updates `sectionRef` opacity imperatively to avoid per-frame React state.
 */
export function useSectionScrollOpacityStyle(
  sectionRef: RefObject<HTMLElement | null>,
  range?: ScrollOpacityRange,
  options?: UseSectionScrollOpacityStyleOptions
): CSSProperties | undefined {
  const respectReducedMotion = options?.respectReducedMotion !== false;
  const shouldReduceMotion = useShouldReduceMotion(!respectReducedMotion);

  const [outStartInit] = range?.output ?? [0, 1];
  const opacityRef = useRef(clamp01(outStartInit ?? 0));

  useLayoutEffect(() => {
    if (!range || shouldReduceMotion) return;
    const [o0] = range.output ?? [0, 1];
    const initial = clamp01(o0 ?? 0);
    opacityRef.current = initial;
    const el = sectionRef.current;
    if (el) el.style.opacity = String(initial);
  }, [range, shouldReduceMotion, sectionRef]);

  const handleProgress = useCallback(
    (progress: number) => {
      if (!range || shouldReduceMotion) return;
      const [inStart, inEnd] = range.input ?? [0, 1];
      const [outStart, outEnd] = range.output ?? [0, 1];

      const inputSpan = inEnd - inStart || 1;
      const normalized = clamp01((progress - inStart) / inputSpan);
      const value = outStart + (outEnd - outStart) * normalized;
      opacityRef.current = value;
      const el = sectionRef.current;
      if (el) el.style.opacity = String(value);
    },
    [range, shouldReduceMotion, sectionRef]
  );

  useSectionScrollProgressFM({
    sectionRef,
    onProgress: range && !shouldReduceMotion ? handleProgress : undefined,
  });

  const reducedMotionOpacityStyle = useMemo((): CSSProperties | undefined => {
    if (!range || !shouldReduceMotion) return undefined;
    const [, outEnd] = range.output ?? [0, 1];
    const fallbackOpacity = clamp01(outEnd ?? 1);
    return { opacity: fallbackOpacity };
  }, [range, shouldReduceMotion]);

  if (!range) return undefined;

  if (shouldReduceMotion) {
    return reducedMotionOpacityStyle;
  }

  // Scroll-driven: opacity is set in layout effect + progress handler (avoid ref reads during render).
  return undefined;
}
