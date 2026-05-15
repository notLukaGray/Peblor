"use client";

import { useCallback, useEffect, useRef } from "react";
import { getItemStart, getScrollPosition, setScrollPosition } from "./infinite-scroll-math";
import type { ScrollAxis } from "./infinite-scroll-types";

type LoopBoundsOptions = {
  axis: ScrollAxis;
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemCount: number;
  itemRefs: React.RefObject<Array<HTMLDivElement | null>>;
  loop: boolean;
};

export function useInfiniteScrollLoopBounds({
  axis,
  containerRef,
  itemCount,
  itemRefs,
  loop,
}: LoopBoundsOptions) {
  const retryFrameRef = useRef<number | null>(null);

  const clearRetryFrame = useCallback(() => {
    if (retryFrameRef.current != null) {
      cancelAnimationFrame(retryFrameRef.current);
      retryFrameRef.current = null;
    }
  }, []);

  const getLoopSpan = useCallback(() => {
    if (!loop || itemCount <= 0) return 0;
    const firstItem = itemRefs.current[0];
    const middleItem = itemRefs.current[itemCount];
    if (!firstItem || !middleItem) return 0;
    return getItemStart(middleItem, axis) - getItemStart(firstItem, axis);
  }, [axis, itemCount, itemRefs, loop]);

  const normalizeLoopScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container || !loop || itemCount <= 0) return true;

    const loopSpan = getLoopSpan();
    if (loopSpan <= 0) return false;

    const currentPosition = getScrollPosition(container, axis);
    const lowerBound = loopSpan * 0.5;
    const upperBound = loopSpan * 1.5;

    if (currentPosition < lowerBound) {
      setScrollPosition(container, axis, currentPosition + loopSpan);
      return true;
    }

    if (currentPosition > upperBound) {
      setScrollPosition(container, axis, currentPosition - loopSpan);
      return true;
    }

    return true;
  }, [axis, containerRef, getLoopSpan, itemCount, loop]);

  const scheduleNormalizeRetry = useCallback(
    (maxRetries = 8) => {
      clearRetryFrame();

      let attempt = 0;
      const tick = () => {
        if (normalizeLoopScrollPosition()) {
          retryFrameRef.current = null;
          return;
        }
        if (attempt >= maxRetries) {
          retryFrameRef.current = null;
          return;
        }
        attempt += 1;
        retryFrameRef.current = requestAnimationFrame(tick);
      };

      retryFrameRef.current = requestAnimationFrame(tick);
    },
    [clearRetryFrame, normalizeLoopScrollPosition]
  );

  useEffect(() => clearRetryFrame, [clearRetryFrame]);

  return {
    getLoopSpan,
    normalizeLoopScrollPosition,
    scheduleNormalizeRetry,
  };
}
