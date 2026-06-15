"use client";

import { useEffect, useRef } from "react";
import { firePeblorProgressTrigger } from "@/peblor/triggers";
import type { PeblorAction } from "@pb/contracts/types";

export type CursorTriggerDef = {
  /** Which axis drives progress: "x" (left→right 0–1) or "y" (top→bottom 0–1) */
  axis: "x" | "y";
  /** Action to fire with progress (0=left/top, 1=right/bottom) */
  action: PeblorAction;
  /** Throttle in ms (default 16 = ~60fps) */
  throttleMs?: number;
};

/**
 * Tracks cursor position and fires peblor progress triggers.
 * Progress is normalized 0–1 across the viewport (or provided element).
 */
export function useCursorTrigger(triggers: CursorTriggerDef[]): void {
  const lastFireRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (!triggers || triggers.length === 0) return;

    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const xProgress = e.clientX / window.innerWidth;
      const yProgress = e.clientY / window.innerHeight;

      triggers.forEach((def, i) => {
        const throttle = def.throttleMs ?? 16;
        const last = lastFireRef.current.get(i) ?? 0;
        if (now - last < throttle) return;
        lastFireRef.current.set(i, now);

        const progress = def.axis === "x" ? xProgress : yProgress;
        firePeblorProgressTrigger(progress, def.action);
      });
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [triggers]);
}
