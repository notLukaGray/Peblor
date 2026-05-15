"use client";

import { useEffect, useRef } from "react";
import { useScrollContainer } from "@/peblor/section/position/use-scroll-container";

export type UsePageScrollProgressOptions = {
  onProgress?: (progress: number) => void;

  startOffset?: number;

  endOffset?: number;
};

export function usePageScrollProgress({
  onProgress,
  startOffset = 0,
  endOffset = 0,
}: UsePageScrollProgressOptions): void {
  const container = useScrollContainer();
  const rafIdRef = useRef<number | null>(null);
  const lastProgressRef = useRef<number | null>(null);

  useEffect(() => {
    if (!container || !onProgress) return;

    const calculateProgress = (): number => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const scrollHeight = container.scrollHeight;

      const maxScroll = scrollHeight - containerHeight;
      const startPoint = startOffset;
      const endPoint = Math.max(startPoint, maxScroll - endOffset);

      let progress = 0;
      if (scrollTop < startPoint) {
        progress = 0;
      } else if (scrollTop > endPoint) {
        progress = 1;
      } else {
        const range = endPoint - startPoint;
        const position = scrollTop - startPoint;
        progress = range > 0 ? Math.max(0, Math.min(1, position / range)) : 0;
      }

      return progress;
    };

    const updateProgress = () => {
      const progress = calculateProgress();

      if (
        lastProgressRef.current === null ||
        Math.abs(progress - lastProgressRef.current) > 0.001
      ) {
        lastProgressRef.current = progress;
        onProgress(progress);
      }

      rafIdRef.current = null;
    };

    const handleScroll = () => {
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(updateProgress);
      }
    };

    const handleResize = () => {
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastProgressRef.current = null;
    };
  }, [container, onProgress, startOffset, endOffset]);
}
