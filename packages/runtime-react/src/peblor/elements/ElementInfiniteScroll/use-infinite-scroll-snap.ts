"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  LOOP_COPY_COUNT,
  PROGRAMMATIC_INSTANT_SUPPRESS_MS,
  SETTLE_IDLE_MS,
  clampIndex,
  getContainerExtent,
  getItemScrollOffset,
  getItemSize,
  getNowMs,
  getScrollPosition,
  wrapIndex,
} from "./infinite-scroll-math";
import type { ScrollAxis, SnapAlign } from "./infinite-scroll-types";

type UseInfiniteScrollSnapOptions = {
  axis: ScrollAxis;
  containerRef: React.RefObject<HTMLDivElement | null>;
  fallbackSelectableBaseIndex: number;
  initialRenderedIndex: number;
  itemCount: number;
  itemRefs: React.RefObject<Array<HTMLDivElement | null>>;
  loop: boolean;
  normalizedInitialIndex: number;
  prefersReducedMotion: boolean;
  selectableBaseIndices: number[];
  selectableRenderedIndices: number[];
  snapAlign: SnapAlign;
};

/**
 * Native-first carousel engine.
 *
 * The browser owns the physics: `scroll-snap-type: mandatory` (set in the container
 * style) drives momentum and snapping identically across touch, trackpad, and mouse.
 * This hook only:
 *   1. tracks whether motion is in flight (`isMoving`)
 *   2. detects settle via the native `scrollend` event (with an idle-timer fallback for
 *      browsers without it) and commits the nearest snapped item
 *   3. recenters an infinite loop onto the middle copy at rest — an instant, invisible
 *      jump because every copy renders the same content, restoring full neighbours
 *   4. performs programmatic / keyboard navigation by smooth-scrolling to the nearest
 *      copy of the target (shortest visual path), letting native snap finish the landing
 *
 * It never simulates deceleration, so it can't fight the in-flight native snap the way
 * the previous velocity/tick engine did.
 */
export function useInfiniteScrollSnap({
  axis,
  containerRef,
  fallbackSelectableBaseIndex,
  initialRenderedIndex,
  itemCount,
  itemRefs,
  loop,
  normalizedInitialIndex,
  prefersReducedMotion,
  selectableBaseIndices,
  selectableRenderedIndices,
  snapAlign,
}: UseInfiniteScrollSnapOptions) {
  const [committedRenderedIndex, setCommittedRenderedIndex] = useState(initialRenderedIndex);
  const [isMoving, setIsMoving] = useState(false);
  const committedRenderedIndexRef = useRef(initialRenderedIndex);
  const isMovingRef = useRef(false);
  const isPointerActiveRef = useRef(false);
  const requestedRenderedIndexRef = useRef<number | null>(null);
  const suppressUntilRef = useRef(0);
  const idleTimerRef = useRef<number | null>(null);

  const activeBaseIndex = useMemo(
    () =>
      itemCount > 0
        ? loop
          ? wrapIndex(committedRenderedIndex, itemCount)
          : clampIndex(committedRenderedIndex, itemCount)
        : 0,
    [committedRenderedIndex, itemCount, loop]
  );

  // ─── Index resolution ───────────────────────────────────────────────────────
  const getCanonicalRenderedIndex = useCallback(
    (baseIndex: number) => (loop ? itemCount + baseIndex : baseIndex),
    [itemCount, loop]
  );

  const resolveCanonicalRenderedIndex = useCallback(
    (targetRenderedIndex: number) => {
      const baseIndex = loop
        ? wrapIndex(targetRenderedIndex, itemCount)
        : clampIndex(targetRenderedIndex, itemCount);
      const safeBaseIndex = selectableBaseIndices.includes(baseIndex)
        ? baseIndex
        : fallbackSelectableBaseIndex;
      return {
        safeBaseIndex,
        canonicalRenderedIndex: getCanonicalRenderedIndex(safeBaseIndex),
      };
    },
    [fallbackSelectableBaseIndex, getCanonicalRenderedIndex, itemCount, loop, selectableBaseIndices]
  );

  // ─── Scroll primitives ──────────────────────────────────────────────────────
  const scrollToRenderedIndex = useCallback(
    (nextRenderedIndex: number, behavior: ScrollBehavior) => {
      const { current: container } = containerRef;
      const { current: items } = itemRefs;
      const item = items[nextRenderedIndex];
      if (!container || !item) return false;

      const resolvedBehavior: ScrollBehavior =
        prefersReducedMotion && behavior === "smooth" ? "auto" : behavior;
      // Instant position sets (recenter / realign / init) must not register as user
      // motion — swallow the scroll events they generate for a short window.
      if (resolvedBehavior === "auto") {
        suppressUntilRef.current = getNowMs() + PROGRAMMATIC_INSTANT_SUPPRESS_MS;
      }

      const nextPosition = getItemScrollOffset(container, item, axis, snapAlign);
      if (axis === "horizontal") {
        container.scrollTo({ left: nextPosition, behavior: resolvedBehavior });
      } else {
        container.scrollTo({ top: nextPosition, behavior: resolvedBehavior });
      }
      return true;
    },
    [axis, containerRef, itemRefs, prefersReducedMotion, snapAlign]
  );

  const getNearestRenderedIndex = useCallback(() => {
    const container = containerRef.current;
    const fallback = committedRenderedIndexRef.current;
    if (!container || itemCount === 0) return fallback;

    const currentPosition = getScrollPosition(container, axis);
    let nearestIndex = fallback;
    let smallestDistance = Number.POSITIVE_INFINITY;

    const { current: items } = itemRefs;
    for (const index of selectableRenderedIndices) {
      const item = items[index];
      if (!item) continue;
      const distance = Math.abs(
        getItemScrollOffset(container, item, axis, snapAlign) - currentPosition
      );
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nearestIndex = index;
      }
    }
    return nearestIndex;
  }, [axis, containerRef, itemCount, itemRefs, selectableRenderedIndices, snapAlign]);

  // In a looped carousel each base item renders in LOOP_COPY_COUNT copies. Pick the
  // copy nearest the current position so animated navigation takes the shortest visual
  // path instead of always spinning to the middle copy.
  const pickNearestRenderedIndexForBase = useCallback(
    (targetBaseIndex: number) => {
      const canonical = getCanonicalRenderedIndex(targetBaseIndex);
      const container = containerRef.current;
      if (!loop || itemCount === 0 || !container) return canonical;

      const currentPosition = getScrollPosition(container, axis);
      let bestRenderedIndex = canonical;
      let bestDistance = Number.POSITIVE_INFINITY;

      const { current: items } = itemRefs;
      for (let copyIndex = 0; copyIndex < LOOP_COPY_COUNT; copyIndex += 1) {
        const candidate = copyIndex * itemCount + targetBaseIndex;
        const item = items[candidate];
        if (!item) continue;
        const distance = Math.abs(
          getItemScrollOffset(container, item, axis, snapAlign) - currentPosition
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          bestRenderedIndex = candidate;
        }
      }
      return bestRenderedIndex;
    },
    [axis, containerRef, getCanonicalRenderedIndex, itemCount, itemRefs, loop, snapAlign]
  );

  // ─── Settle ─────────────────────────────────────────────────────────────────
  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const settle = useCallback(() => {
    clearIdleTimer();
    const container = containerRef.current;
    if (!container || itemCount === 0) return;
    // Still dragging — settle when the pointer is released and momentum ends.
    if (isPointerActiveRef.current) return;

    const targetRenderedIndex = requestedRenderedIndexRef.current ?? getNearestRenderedIndex();
    const { canonicalRenderedIndex } = resolveCanonicalRenderedIndex(targetRenderedIndex);

    committedRenderedIndexRef.current = canonicalRenderedIndex;
    setCommittedRenderedIndex(canonicalRenderedIndex);
    requestedRenderedIndexRef.current = null;

    // Recenter onto the canonical (middle) copy at the exact snap offset. Instant +
    // suppressed; identical content means the jump is invisible but restores neighbours.
    scrollToRenderedIndex(canonicalRenderedIndex, "auto");

    isMovingRef.current = false;
    setIsMoving(false);
  }, [
    clearIdleTimer,
    containerRef,
    getNearestRenderedIndex,
    itemCount,
    resolveCanonicalRenderedIndex,
    scrollToRenderedIndex,
  ]);

  const settleRef = useRef(settle);
  useEffect(() => {
    settleRef.current = settle;
  }, [settle]);

  const armIdleSettle = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(() => {
      idleTimerRef.current = null;
      settleRef.current();
    }, SETTLE_IDLE_MS);
  }, [clearIdleTimer]);

  const markMoving = useCallback(() => {
    if (itemCount <= 1) return;
    if (!isMovingRef.current) {
      isMovingRef.current = true;
      setIsMoving(true);
    }
    // Idle timer is the universal settle fallback; `scrollend` settles sooner when present.
    armIdleSettle();
  }, [armIdleSettle, itemCount]);

  const onScroll = useCallback(() => {
    if (itemCount <= 1) return;
    const now = getNowMs();
    // Swallow scroll events from instant programmatic position sets, unless the user is
    // actively dragging (in which case their input always wins).
    if (now < suppressUntilRef.current && !isPointerActiveRef.current) return;
    if (isPointerActiveRef.current) requestedRenderedIndexRef.current = null;
    markMoving();
  }, [itemCount, markMoving]);

  // Native settle signal. Fires once momentum + snap fully stop on every device that
  // supports it (Chrome 114+, Firefox 109+, Safari 18.2+); the idle timer covers the rest.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScrollEnd = () => {
      if (!isPointerActiveRef.current) settleRef.current();
    };
    container.addEventListener("scrollend", onScrollEnd);
    return () => container.removeEventListener("scrollend", onScrollEnd);
  }, [containerRef, itemCount]);

  // ─── Commands ───────────────────────────────────────────────────────────────
  const commitToRenderedIndex = useCallback(
    (targetRenderedIndex: number, options: { animate: boolean }) => {
      if (itemCount === 0) return;

      const { safeBaseIndex, canonicalRenderedIndex } =
        resolveCanonicalRenderedIndex(targetRenderedIndex);
      const useAnimation = options.animate && !prefersReducedMotion;

      if (!useAnimation) {
        clearIdleTimer();
        committedRenderedIndexRef.current = canonicalRenderedIndex;
        setCommittedRenderedIndex(canonicalRenderedIndex);
        requestedRenderedIndexRef.current = null;
        scrollToRenderedIndex(canonicalRenderedIndex, "auto");
        isMovingRef.current = false;
        setIsMoving(false);
        return;
      }

      const scrollTarget = loop
        ? pickNearestRenderedIndexForBase(safeBaseIndex)
        : canonicalRenderedIndex;
      requestedRenderedIndexRef.current = scrollTarget;
      isMovingRef.current = true;
      setIsMoving(true);

      const ok = scrollToRenderedIndex(scrollTarget, "smooth");
      if (!ok) {
        settleRef.current();
        return;
      }
      // Backstop: `scrollend` normally settles, but arm the idle timer in case the
      // smooth scroll is a no-op (already at target) and never reports an end.
      armIdleSettle();
    },
    [
      armIdleSettle,
      clearIdleTimer,
      itemCount,
      loop,
      pickNearestRenderedIndexForBase,
      prefersReducedMotion,
      resolveCanonicalRenderedIndex,
      scrollToRenderedIndex,
    ]
  );

  const goToRenderedIndex = useCallback(
    (nextRenderedIndex: number) => {
      if (itemCount === 0) return;
      commitToRenderedIndex(nextRenderedIndex, { animate: true });
    },
    [commitToRenderedIndex, itemCount]
  );

  const goToBaseIndex = useCallback(
    (baseIndex: number) => {
      if (itemCount === 0 || selectableBaseIndices.length === 0) return;
      const safeBaseIndex = selectableBaseIndices.includes(baseIndex)
        ? baseIndex
        : fallbackSelectableBaseIndex;
      commitToRenderedIndex(getCanonicalRenderedIndex(safeBaseIndex), { animate: true });
    },
    [
      commitToRenderedIndex,
      fallbackSelectableBaseIndex,
      getCanonicalRenderedIndex,
      itemCount,
      selectableBaseIndices,
    ]
  );

  const stepBy = useCallback(
    (delta: number) => {
      if (itemCount === 0 || delta === 0 || selectableRenderedIndices.length === 0) return;

      // Anchor on the committed copy; if it isn't in the selectable list (e.g. just after
      // mount), fall back to whatever copy is visually nearest.
      let currentSelectableIndex = selectableRenderedIndices.indexOf(
        committedRenderedIndexRef.current
      );
      if (currentSelectableIndex < 0) {
        currentSelectableIndex = selectableRenderedIndices.indexOf(getNearestRenderedIndex());
      }
      if (currentSelectableIndex < 0) return;

      const nextSelectableIndex = loop
        ? wrapIndex(currentSelectableIndex + delta, selectableRenderedIndices.length)
        : clampIndex(currentSelectableIndex + delta, selectableRenderedIndices.length);
      const nextRenderedIndex = selectableRenderedIndices[nextSelectableIndex];
      if (nextRenderedIndex == null) return;
      goToRenderedIndex(nextRenderedIndex);
    },
    [getNearestRenderedIndex, goToRenderedIndex, itemCount, loop, selectableRenderedIndices]
  );

  const getPageStep = useCallback(() => {
    const container = containerRef.current;
    const { current: items } = itemRefs;
    const currentItem = items[committedRenderedIndexRef.current];
    if (!container || !currentItem) return 1;
    const containerExtent = getContainerExtent(container, axis);
    const itemExtent = getItemSize(currentItem, axis);
    if (containerExtent <= 0 || itemExtent <= 0) return 1;
    return Math.max(1, Math.round(containerExtent / itemExtent));
  }, [axis, containerRef, itemRefs]);

  const stepByPage = useCallback(
    (direction: 1 | -1) => {
      stepBy(direction * getPageStep());
    },
    [getPageStep, stepBy]
  );

  const realignToCommitted = useCallback(() => {
    if (itemCount === 0) return;
    if (getNowMs() < suppressUntilRef.current) return;
    scrollToRenderedIndex(committedRenderedIndexRef.current, "auto");
  }, [itemCount, scrollToRenderedIndex]);

  const setPointerActive = useCallback(
    (nextIsPointerActive: boolean) => {
      isPointerActiveRef.current = nextIsPointerActive;
      if (nextIsPointerActive) {
        // User grabs control: drop any in-flight programmatic target and pause settling.
        requestedRenderedIndexRef.current = null;
        clearIdleTimer();
        return;
      }
      // Released: native momentum (if any) will fire `scrollend`; arm the idle backstop
      // in case the gesture ended already at rest.
      armIdleSettle();
    },
    [armIdleSettle, clearIdleTimer]
  );

  const clearPendingSnapTarget = useCallback(() => {
    requestedRenderedIndexRef.current = null;
  }, []);

  // ─── Init / item-count changes ────────────────────────────────────────────────
  const scrollToRenderedIndexRef = useRef(scrollToRenderedIndex);
  useEffect(() => {
    scrollToRenderedIndexRef.current = scrollToRenderedIndex;
  }, [scrollToRenderedIndex]);

  useLayoutEffect(() => {
    if (itemCount === 0) {
      committedRenderedIndexRef.current = 0;
      isMovingRef.current = false;
      queueMicrotask(() => {
        setCommittedRenderedIndex(0);
        setIsMoving(false);
      });
      return;
    }

    const nextRenderedIndex = loop ? itemCount + normalizedInitialIndex : normalizedInitialIndex;
    committedRenderedIndexRef.current = nextRenderedIndex;
    isMovingRef.current = false;
    requestedRenderedIndexRef.current = null;
    suppressUntilRef.current = 0;
    queueMicrotask(() => {
      setCommittedRenderedIndex(nextRenderedIndex);
      setIsMoving(false);
    });

    const frame = requestAnimationFrame(() => {
      scrollToRenderedIndexRef.current(nextRenderedIndex, "auto");
    });
    return () => cancelAnimationFrame(frame);
  }, [itemCount, loop, normalizedInitialIndex]);

  useEffect(() => () => clearIdleTimer(), [clearIdleTimer]);

  return {
    activeBaseIndex,
    clearPendingSnapTarget,
    committedRenderedIndex,
    goToBaseIndex,
    goToRenderedIndex,
    isMoving,
    isMovingRef,
    isPointerActiveRef,
    onScroll,
    realignToCommitted,
    setPointerActive,
    stepBy,
    stepByPage,
  };
}
