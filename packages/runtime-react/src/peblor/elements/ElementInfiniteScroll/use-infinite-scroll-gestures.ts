"use client";

import { useCallback, useEffect } from "react";
import type { ScrollAxis } from "./infinite-scroll-types";

type UseInfiniteScrollGesturesOptions = {
  axis: ScrollAxis;
  cancelPendingSnapTarget: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  goToBaseIndex: (baseIndex: number) => void;
  itemCount: number;
  loop: boolean;
  markMoving: () => void;
  selectableBaseIndices: number[];
  setPointerActive: (isPointerActive: boolean) => void;
  stepBy: (delta: number) => void;
  stepByPage: (direction: 1 | -1) => void;
};

export function useInfiniteScrollGestures({
  axis,
  cancelPendingSnapTarget,
  containerRef,
  goToBaseIndex,
  itemCount,
  loop,
  markMoving,
  selectableBaseIndices,
  setPointerActive,
  stepBy,
  stepByPage,
}: UseInfiniteScrollGesturesOptions) {
  // Vertical-wheel-drives-horizontal assist for horizontal carousels.
  //
  // Horizontal-dominant gestures (trackpad swipe, shift+wheel) are left to the native
  // scroll container so its momentum + scroll-snap stay intact. Only vertical-dominant
  // wheel/trackpad input is translated into horizontal travel — and unlike the old
  // implementation there is no rolling "wheel lock": each delta scrolls natively and CSS
  // scroll-snap settles it once the wheel stream stops, so it never fights an in-flight
  // snap. A non-looping carousel releases the gesture at its edges so the page can still
  // scroll past it; the capture only applies while the pointer is over the carousel.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || itemCount <= 1 || axis !== "horizontal") return;

    const handleWheel = (event: WheelEvent) => {
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      if (absX === 0 && absY === 0) return;
      if (absX >= absY) return; // horizontal intent → native handles it

      if (!loop) {
        const max = container.scrollWidth - container.clientWidth;
        const atStart = container.scrollLeft <= 0;
        const atEnd = container.scrollLeft >= max - 1;
        const goingForward = event.deltaY > 0;
        if ((goingForward && atEnd) || (!goingForward && atStart)) return; // let the page scroll
      }

      event.preventDefault();
      cancelPendingSnapTarget();
      container.scrollBy({ left: event.deltaY });
      markMoving();
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [axis, cancelPendingSnapTarget, containerRef, itemCount, loop, markMoving]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (itemCount <= 1) return;

      const isVertical = axis === "vertical";
      const prevKey = isVertical ? "ArrowUp" : "ArrowLeft";
      const nextKey = isVertical ? "ArrowDown" : "ArrowRight";

      if (event.key === prevKey) {
        event.preventDefault();
        stepBy(-1);
        return;
      }
      if (event.key === nextKey) {
        event.preventDefault();
        stepBy(1);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        const firstIndex = selectableBaseIndices[0];
        if (firstIndex != null) goToBaseIndex(firstIndex);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        const lastIndex = selectableBaseIndices[selectableBaseIndices.length - 1];
        if (lastIndex != null) goToBaseIndex(lastIndex);
        return;
      }
      if (event.key === "PageUp") {
        event.preventDefault();
        stepByPage(-1);
        return;
      }
      if (event.key === "PageDown") {
        event.preventDefault();
        stepByPage(1);
      }
    },
    [axis, goToBaseIndex, itemCount, selectableBaseIndices, stepBy, stepByPage]
  );

  const onPointerDown = useCallback(() => {
    setPointerActive(true);
  }, [setPointerActive]);

  const onPointerUp = useCallback(() => {
    setPointerActive(false);
  }, [setPointerActive]);

  const onPointerCancel = useCallback(() => {
    setPointerActive(false);
  }, [setPointerActive]);

  return {
    onKeyDown,
    onPointerCancel,
    onPointerDown,
    onPointerUp,
  };
}
