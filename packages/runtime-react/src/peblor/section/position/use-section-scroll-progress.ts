"use client";

import { useSectionScrollProgressFM } from "@/peblor/integrations/framer-motion/section-scroll-progress";

export type UseSectionScrollProgressOptions = {
  sectionRef: React.RefObject<HTMLElement | null>;
  onProgress?: (progress: number) => void;
  startOffset?: number;
  endOffset?: number;
};

/**
 * Tracks scroll progress through a section (0-1).
 * Progress is 0 when section enters viewport, 1 when it fully exits.
 * Implemented via Framer Motion useScroll in integrations/framer-motion.
 */
export function useSectionScrollProgress({
  sectionRef,
  onProgress,
  startOffset = 0,
  endOffset = 0,
}: UseSectionScrollProgressOptions): void {
  useSectionScrollProgressFM({
    sectionRef,
    onProgress,
    startOffset,
    endOffset,
  });
}
