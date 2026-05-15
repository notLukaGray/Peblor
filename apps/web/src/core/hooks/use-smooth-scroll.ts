"use client";

import { useEffect, useRef, type RefObject } from "react";

export type SmoothScrollOptions = {
  smoothness?: number;
};

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
      e.preventDefault();
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      targetRef.current = Math.max(0, Math.min(max, targetRef.current + e.deltaY));
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
    // containerRef identity is stable in callers; effect intentionally keys on smoothness only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smoothness]);
}
