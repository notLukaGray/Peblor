"use client";

import { type RefObject } from "react";
import { useScroll } from "@/peblor/integrations/framer-motion/triggers";
import { useMotionValueEvent } from "@/peblor/integrations/framer-motion/motion-values";
import { useScrollContainerRef } from "@/peblor/section/position/use-scroll-container";

export type UseSectionScrollProgressFMOptions = {
  sectionRef: RefObject<HTMLElement | null>;
  onProgress?: (progress: number) => void;
  startOffset?: number;
  endOffset?: number;
};

/**
 * Section scroll progress (0–1) via Framer Motion useScroll.
 * Progress 0 = section entering viewport, 1 = section past.
 * When containerRef is null (no ScrollContainerProvider), container is undefined and FM tracks window.
 */
export function useSectionScrollProgressFM({
  sectionRef,
  onProgress,
  startOffset = 0,
  endOffset = 0,
}: UseSectionScrollProgressFMOptions): void {
  const containerRef = useScrollContainerRef();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: containerRef ?? undefined,
    offset: ["start end", "end start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!onProgress) return;
    const clamped = Math.max(0, Math.min(1, latest));
    if (startOffset === 0 && endOffset === 0) {
      onProgress(clamped);
      return;
    }
    const start = startOffset;
    const end = 1 - endOffset;
    const mapped = end <= start ? clamped : (clamped - start) / (end - start);
    onProgress(Math.max(0, Math.min(1, mapped)));
  });
}
