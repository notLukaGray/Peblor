"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";

export type SmoothScrollOptions = {
  smoothness?: number;
};

const OVERFLOW_SCROLLISH = new Set(["auto", "scroll", "overlay"]);

function nestedCanAbsorbVerticalWheel(
  pageEl: HTMLElement,
  target: EventTarget | null,
  deltaY: number
): boolean {
  if (!(target instanceof Element) || deltaY === 0) return false;
  let node: Element | null = target;
  while (node && node !== pageEl) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      if (!OVERFLOW_SCROLLISH.has(style.overflowY)) {
        node = node.parentElement;
        continue;
      }
      if (node.scrollHeight <= node.clientHeight + 1) {
        node = node.parentElement;
        continue;
      }
      const goingDown = deltaY > 0;
      const epsilon = 1;
      const atTop = node.scrollTop <= epsilon;
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - epsilon;
      if ((goingDown && !atBottom) || (!goingDown && !atTop)) return true;
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * Attaches a lerp-based smooth scroll to `containerRef`.
 *
 * Returns a stable `scrollTo(top)` function that drives the same lerp animation
 * as wheel input — use this from programmatic scrollTo actions so they don't
 * conflict with the ongoing rAF loop.
 */
export function useSmoothScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  options: SmoothScrollOptions = {}
): (top: number) => void {
  const { smoothness = 0.5 } = options;
  const targetRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);
  const runningRef = useRef(false);
  // Stable ref to the programmatic scrollTo impl; reassigned each time the effect runs.
  const scrollToRef = useRef<(top: number) => void>(() => {});

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    targetRef.current = el.scrollTop;
    // Lerp factor: base − smoothness × range.
    // At smoothness=0 → factor = base (fast); at smoothness=1 → factor = base − range (slow).
    // Both constants are config-driven via motion-defaults.json.
    const ease =
      MOTION_DEFAULTS.smoothScrollBaseFactor - smoothness * MOTION_DEFAULTS.smoothScrollRangeFactor;

    let lastScrollTop = el.scrollTop;

    const tick = () => {
      rafRef.current = undefined;
      const node = containerRef.current;
      if (!node) {
        runningRef.current = false;
        return;
      }
      const max = node.scrollHeight - node.clientHeight;
      const current = node.scrollTop;
      const target = Math.max(0, Math.min(max, targetRef.current));
      const next = current + (target - current) * ease;
      const done = Math.abs(target - next) < 0.5;

      // If scrollTop changed by more than one tick of lerp could produce,
      // an external scroll (e.g. scrollIntoView from a scrollTo action)
      // moved us — sync the target so we don't fight back.
      const maxLerpChange = Math.abs(target - lastScrollTop) * ease + 1;
      if (Math.abs(current - lastScrollTop) > maxLerpChange) {
        targetRef.current = current;
        lastScrollTop = current;
        if (!runningRef.current) runningRef.current = true;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      node.scrollTop = done ? target : next;
      lastScrollTop = node.scrollTop;
      if (done) {
        runningRef.current = false;
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (nestedCanAbsorbVerticalWheel(el, e.target, e.deltaY)) {
        return;
      }
      e.preventDefault();
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 3;
      else if (e.deltaMode === 2) delta *= window.innerHeight;
      targetRef.current = Math.max(0, Math.min(max, targetRef.current + delta));
      if (!runningRef.current) {
        runningRef.current = true;
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    // Programmatic scrollTo: set a new lerp target and kick off the rAF if idle.
    // Resets lastScrollTop so the external-change heuristic doesn't fight the new direction.
    scrollToRef.current = (top: number) => {
      const max = el.scrollHeight - el.clientHeight;
      targetRef.current = Math.max(0, Math.min(max, top));
      lastScrollTop = el.scrollTop;
      if (!runningRef.current) {
        runningRef.current = true;
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      scrollToRef.current = () => {};
      el.removeEventListener("wheel", onWheel);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [containerRef, smoothness]);

  // Stable wrapper so callers don't need to add scrollToRef to their deps.
  return useCallback((top: number) => {
    scrollToRef.current(top);
  }, []);
}
