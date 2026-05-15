"use client";

import { useEffect, useRef, type RefObject } from "react";

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

export function useSmoothScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  options: SmoothScrollOptions = {}
) {
  const { smoothness = 0.5 } = options;
  const targetRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);
  const runningRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    targetRef.current = el.scrollTop;
    const ease = 0.25 - smoothness * 0.2;

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
      node.scrollTop = done ? target : next;
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

    el.addEventListener("wheel", onWheel, { passive: false });
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener("wheel", onWheel);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [containerRef, smoothness]);
}
