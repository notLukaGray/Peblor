"use client";

import { useEffect, useRef } from "react";
import { firePeblorAction } from "@/peblor/triggers";
import type { PeblorAction } from "@pb/contracts/types";

export type TimerTriggerDef = {
  /** Fire once after this many ms */
  delay?: number;
  /** Fire repeatedly every this many ms */
  interval?: number;
  /** Action to fire */
  action: PeblorAction;
  /** For interval: max number of times to fire (omit for infinite) */
  maxFires?: number;
};

/**
 * Fires peblor actions after delays or on intervals.
 * Timers reset when `triggers` reference changes.
 */
export function useTimerTrigger(triggers: TimerTriggerDef[]): void {
  const countRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (!triggers || triggers.length === 0) return;

    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    const intervalIds: ReturnType<typeof setInterval>[] = [];
    countRef.current.clear();

    triggers.forEach((def, i) => {
      if (def.delay != null && def.interval == null) {
        // One-shot delay
        const id = setTimeout(() => {
          firePeblorAction(def.action, "trigger");
        }, def.delay);
        timeoutIds.push(id);
      } else if (def.interval != null) {
        // Repeating interval (optionally after an initial delay)
        const start = () => {
          const id = setInterval(() => {
            const count = (countRef.current.get(i) ?? 0) + 1;
            countRef.current.set(i, count);
            firePeblorAction(def.action, "trigger");
            if (def.maxFires != null && count >= def.maxFires) {
              clearInterval(id);
            }
          }, def.interval);
          intervalIds.push(id);
        };
        if (def.delay != null) {
          const delayId = setTimeout(start, def.delay);
          timeoutIds.push(delayId);
        } else {
          start();
        }
      }
    });

    return () => {
      timeoutIds.forEach(clearTimeout);
      intervalIds.forEach(clearInterval);
    };
  }, [triggers]);
}
