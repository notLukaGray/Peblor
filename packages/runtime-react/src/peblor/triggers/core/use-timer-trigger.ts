"use client";

import { useEffect, useRef } from "react";
import { firePeblorAction } from "@/peblor/triggers";
import type { PeblorAction } from "@pb/contracts/types";

export type TimerTriggerDef = {
  /** Optional name — register in the global registry for cancelTimer action */
  id?: string;
  /** Fire once after this many ms */
  delay?: number;
  /** Fire repeatedly every this many ms */
  interval?: number;
  /** Action to fire */
  action: PeblorAction;
  /** For interval: max number of times to fire (omit for infinite) */
  maxFires?: number;
};

// Module-level registry so cancelTimer action can reach named timers.
const namedTimerRegistry = new Map<string, () => void>();

export function cancelNamedTimer(id: string): void {
  const cancel = namedTimerRegistry.get(id);
  if (cancel) {
    cancel();
    namedTimerRegistry.delete(id);
  }
}

export function useTimerTrigger(triggers: TimerTriggerDef[]): void {
  const countRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (!triggers || triggers.length === 0) return;

    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    const intervalIds: ReturnType<typeof setInterval>[] = [];
    const registeredIds: string[] = [];
    countRef.current.clear();

    triggers.forEach((def, i) => {
      if (def.delay != null && def.interval == null) {
        const id = setTimeout(() => {
          firePeblorAction(def.action, "trigger");
          if (def.id) namedTimerRegistry.delete(def.id);
        }, def.delay);
        timeoutIds.push(id);
        if (def.id) {
          namedTimerRegistry.set(def.id, () => clearTimeout(id));
          registeredIds.push(def.id);
        }
      } else if (def.interval != null) {
        const start = () => {
          const id = setInterval(() => {
            const count = (countRef.current.get(i) ?? 0) + 1;
            countRef.current.set(i, count);
            firePeblorAction(def.action, "trigger");
            if (def.maxFires != null && count >= def.maxFires) {
              clearInterval(id);
              if (def.id) namedTimerRegistry.delete(def.id);
            }
          }, def.interval);
          intervalIds.push(id);
          if (def.id) {
            namedTimerRegistry.set(def.id, () => clearInterval(id));
            registeredIds.push(def.id);
          }
        };
        if (def.delay != null) {
          const delayId = setTimeout(start, def.delay);
          timeoutIds.push(delayId);
          // Register cancel for the delay window — overwritten by start() once it fires.
          if (def.id) {
            namedTimerRegistry.set(def.id, () => clearTimeout(delayId));
            registeredIds.push(def.id);
          }
        } else {
          start();
        }
      }
    });

    return () => {
      timeoutIds.forEach(clearTimeout);
      intervalIds.forEach(clearInterval);
      for (const id of registeredIds) namedTimerRegistry.delete(id);
    };
  }, [triggers]);
}
