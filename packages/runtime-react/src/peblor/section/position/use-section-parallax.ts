"use client";

import { useLayoutEffect, useRef } from "react";
import { getDefaultScrollSpeed, parseCssValueToPixels } from "@pb/core/layout";
import { useScrollContainerRef } from "./use-scroll-container";
import { useScroll } from "@/peblor/integrations/framer-motion/triggers";
import { useMotionValue, useTransform } from "@/peblor/integrations/framer-motion/motion-values";
import { useShouldReduceMotion } from "@/peblor/integrations/framer-motion/reduced-motion";
import type { MotionValue } from "@/peblor/integrations/framer-motion/types";

export type UseSectionParallaxOptions = {
  /** When false, ignore system reduced-motion preference (e.g. section has reduceMotion: false). */
  respectReducedMotion?: boolean;
};

/**
 * Parallax transform Y from scroll position via useScroll + useTransform (hardware-accelerated).
 *
 * On first render the parallax offset is suppressed (returns 0) and a layout effect
 * snapshots the current scroll position as a baseline. From that point on, parallax
 * offset is computed relative to the baseline — so every section starts at its natural
 * CSS position and the offset accumulates from the first scroll interaction, avoiding a
 * visible jump when the measurement lands.
 */
export function useSectionParallax(
  scrollSpeed: number = getDefaultScrollSpeed(),
  initialY?: string,
  _sectionRef?: React.RefObject<HTMLElement | null>,
  options?: UseSectionParallaxOptions
): MotionValue<number> | undefined {
  const containerRef = useScrollContainerRef();
  const defaultSpeed = getDefaultScrollSpeed();
  const basePosition = parseCssValueToPixels(initialY, true);
  const respectReducedMotion = options?.respectReducedMotion !== false;
  const shouldReduceMotion = useShouldReduceMotion(!respectReducedMotion);

  const { scrollY } = useScroll({
    container: containerRef ?? undefined,
  });

  // Use 0 as initial value — NaN in a MotionValue can cause Framer Motion / Turbopack issues.
  // A separate ref tracks whether the baseline has been captured so the transform can
  // suppress output until the first layoutEffect snapshot lands.
  const baselineScrollMotion = useMotionValue(0);
  const baselineSetRef = useRef(false);

  useLayoutEffect(() => {
    if (scrollSpeed === defaultSpeed || shouldReduceMotion) return;
    const currentScroll = scrollY.get() ?? 0;
    baselineScrollMotion.set(currentScroll);
    baselineSetRef.current = true;
  }, [scrollSpeed, defaultSpeed, shouldReduceMotion, scrollY, baselineScrollMotion]);

  const parallaxY = useTransform(
    [scrollY, baselineScrollMotion],
    ([scrollTop, baselineScroll]: number[]) => {
      if (scrollSpeed === defaultSpeed || shouldReduceMotion) return 0;
      // Suppress output until layoutEffect has set the baseline snapshot.
      if (!baselineSetRef.current) return 0;

      const s = typeof scrollTop === "number" ? scrollTop : 0;
      const b = typeof baselineScroll === "number" ? baselineScroll : 0;
      const speedMultiplier = scrollSpeed - defaultSpeed;

      if (basePosition !== null) {
        return -(s * speedMultiplier);
      }
      return (s - b) * speedMultiplier;
    }
  );

  if (!containerRef || scrollSpeed === defaultSpeed || shouldReduceMotion) {
    return undefined;
  }
  return parallaxY;
}
