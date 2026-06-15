"use client";

import { useEffect, useRef } from "react";
import { firePeblorAction } from "@/peblor/triggers";
import { useSharedScroll } from "@/peblor/section/position/shared-scroll-listener";
import type { ScrollThresholdTriggerDef } from "@pb/contracts/peblor/core/peblor-schemas/section-block-base-schemas";

export type { ScrollThresholdTriggerDef };

function resolveThreshold(t: number | string): number {
  if (typeof t === "number") return t;
  if (t.endsWith("%")) {
    const pct = parseFloat(t) / 100;
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) * pct;
  }
  return parseFloat(t) || 0;
}

export function useScrollThresholdTrigger(defs: ScrollThresholdTriggerDef[]): void {
  const crossedRef = useRef<Set<number>>(new Set());
  const { subscribe } = useSharedScroll();

  useEffect(() => {
    if (!defs || defs.length === 0) return;

    const handler = (scrollY: number) => {
      defs.forEach((def, i) => {
        const px = resolveThreshold(def.threshold);
        const wasCrossed = crossedRef.current.has(i);
        if (!wasCrossed && scrollY >= px) {
          crossedRef.current.add(i);
          if (def.onCrossDown) firePeblorAction(def.onCrossDown, "trigger");
        } else if (wasCrossed && scrollY < px) {
          crossedRef.current.delete(i);
          if (def.onCrossUp) firePeblorAction(def.onCrossUp, "trigger");
        }
      });
    };

    const unsub = subscribe(handler);
    // Evaluate immediately on mount using current scroll position.
    handler(typeof window !== "undefined" ? window.scrollY : 0);
    return unsub;
  }, [defs, subscribe]);
}
