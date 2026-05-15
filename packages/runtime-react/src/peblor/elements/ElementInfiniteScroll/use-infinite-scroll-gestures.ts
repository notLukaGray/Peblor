"use client";

import { useCallback, useEffect, useRef } from "react";
import { DEFAULT_WHEEL_LOCK_MS, getNowMs } from "./infinite-scroll-math";
import type { ScrollAxis } from "./infinite-scroll-types";

type UseInfiniteScrollGesturesOptions = {
  axis: ScrollAxis;
  cancelPendingSnapTarget: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  goToBaseIndex: (baseIndex: number) => void;
  itemCount: number;
  markMoving: () => void;
  selectableBaseIndices: number[];
  setPointerActive: (isPointerActive: boolean) => void;
  stepBy: (delta: number) => void;
  stepByPage: (direction: 1 | -1) => void;
  wheelLockMs?: number;
};

export function useInfiniteScrollGestures({
  axis,
  cancelPendingSnapTarget,
  containerRef,
  goToBaseIndex,
  itemCount,
  markMoving,
  selectableBaseIndices,
  setPointerActive,
  stepBy,
  stepByPage,
  wheelLockMs = DEFAULT_WHEEL_LOCK_MS,
}: UseInfiniteScrollGesturesOptions) {
  const wheelLockUntilRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || itemCount <= 1 || axis !== "horizontal") return;

    const handleWheel = (event: WheelEvent) => {
      const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const lockActive = getNowMs() < wheelLockUntilRef.current;
      if (!horizontalIntent && !lockActive) return;

      const axisDelta = horizontalIntent
        ? event.deltaX !== 0
          ? event.deltaX
          : event.deltaY
        : event.deltaY;
      if (axisDelta === 0) return;

      wheelLockUntilRef.current = getNowMs() + wheelLockMs;
      cancelPendingSnapTarget();
      event.preventDefault();
      event.stopPropagation();
      container.scrollBy({ left: axisDelta });
      markMoving();
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [axis, cancelPendingSnapTarget, containerRef, itemCount, markMoving, wheelLockMs]);

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
