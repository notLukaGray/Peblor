"use client";

import { useState, type RefObject } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "@/peblor/integrations/framer-motion";
import { useScrollContainerRef } from "@/peblor/section/position/use-scroll-container";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";
import { useShouldReduceMotion } from "./reduced-motion";

type SectionScrollProgressBarProps = {
  sectionRef: RefObject<HTMLElement | null>;
  /** Bar height in CSS; when omitted uses content/motion-defaults progressBar. */
  height?: string;
  /** Bar fill color; when omitted uses content/motion-defaults progressBar. */
  fill?: string;
  /** Track background; when omitted uses content/motion-defaults progressBar. */
  trackBackground?: string;
  /** useScroll offset; e.g. ["start end", "end start"]. When omitted uses default. */
  offset?: [string, string];
  /** Optional className for the bar track. */
  className?: string;
  /** When false, ignore system reduced-motion preference (e.g. section/element has reduceMotion: false). */
  respectReducedMotion?: boolean;
};

/**
 * Renders a scroll progress bar driven by useScroll + useTransform.
 * ScaleX goes 0→1 as the section scrolls through the viewport.
 * Styling from content/motion-defaults progressBar when not overridden.
 */
const DEFAULT_OFFSET: [string, string] = ["start end", "end start"];

export function SectionScrollProgressBar({
  sectionRef,
  height = MOTION_DEFAULTS.progressBar.height,
  fill = MOTION_DEFAULTS.progressBar.fill,
  trackBackground = MOTION_DEFAULTS.progressBar.trackBackground,
  offset = DEFAULT_OFFSET,
  className,
  respectReducedMotion = true,
}: SectionScrollProgressBarProps) {
  const containerRef = useScrollContainerRef();
  const shouldReduceMotion = useShouldReduceMotion(!respectReducedMotion);

  const scrollOptions = {
    target: sectionRef,
    container: containerRef ?? undefined,
    offset,
  };
  const { scrollYProgress } = useScroll(scrollOptions as Parameters<typeof useScroll>[0]);

  const scaleX = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [0, 1]);

  const [progressForA11y, setProgressForA11y] = useState(
    () => Math.round(Math.max(0, Math.min(1, scrollYProgress.get())) * 100) / 100
  );
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const clamped = Math.max(0, Math.min(1, latest));
    setProgressForA11y(Math.round(clamped * 100) / 100);
  });

  return (
    <div
      className={className}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={progressForA11y}
      aria-label="Section scroll progress"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        background: trackBackground,
        transformOrigin: "0 0",
        zIndex: 5,
      }}
    >
      <motion.div
        style={{
          scaleX,
          originX: 0,
          height,
          background: fill,
          width: "100%",
        }}
      />
    </div>
  );
}
