"use client";

import { useEffect, useRef } from "react";
import { firePeblorAction } from "@/peblor/triggers";
import type { PeblorAction } from "@pb/contracts/types";
import { useSharedScroll } from "@/peblor/section/position/shared-scroll-listener";
import { globals } from "@pb/runtime-react/core/lib/globals";

export type ScrollDirectionTriggerDef = {
  /** Action to fire when user scrolls down */
  onScrollDown?: PeblorAction;
  /** Action to fire when user scrolls up */
  onScrollUp?: PeblorAction;
  /** Minimum px delta before direction fires (debounce noise). Default 5. */
  threshold?: number;
};

export function useScrollDirectionTrigger(triggers: ScrollDirectionTriggerDef[]): void {
  const lastScrollY = useRef(typeof window !== "undefined" ? window.scrollY : 0);
  const lastDirection = useRef<"up" | "down" | null>(null);
  const { subscribe } = useSharedScroll();

  useEffect(() => {
    if (!triggers || triggers.length === 0) return;

    const threshold = Math.max(
      ...triggers.map((t) => t.threshold ?? globals.uiScrollDirectionThresholdPx)
    );

    return subscribe((_scrollY, direction) => {
      const current = _scrollY;
      const delta = current - lastScrollY.current;
      if (Math.abs(delta) < threshold) return;

      if (direction === lastDirection.current) {
        lastScrollY.current = current;
        return;
      }
      lastDirection.current = direction;
      lastScrollY.current = current;

      triggers.forEach((def) => {
        if (direction === "down" && def.onScrollDown) firePeblorAction(def.onScrollDown, "trigger");
        if (direction === "up" && def.onScrollUp) firePeblorAction(def.onScrollUp, "trigger");
      });
    });
  }, [triggers, subscribe]);
}
