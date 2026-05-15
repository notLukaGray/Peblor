"use client";

import { useEffect, useRef } from "react";
import { firePeblorAction } from "@/peblor/triggers";
import type { PeblorAction } from "@pb/contracts/types";

export type IdleTriggerDef = {
  /** Ms of inactivity before firing onIdle. Default 5000. */
  idleAfterMs?: number;
  onIdle?: PeblorAction;
  onActive?: PeblorAction;
};

export function useIdleTrigger(triggers: IdleTriggerDef[]): void {
  const isIdleRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!triggers || triggers.length === 0) return;

    const resetTimer = () => {
      if (isIdleRef.current) {
        isIdleRef.current = false;
        triggers.forEach((def) => {
          if (def.onActive) firePeblorAction(def.onActive, "trigger");
        });
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const minIdleMs = Math.min(...triggers.map((t) => t.idleAfterMs ?? 5000));
      timeoutRef.current = setTimeout(() => {
        isIdleRef.current = true;
        triggers.forEach((def) => {
          if (def.onIdle) firePeblorAction(def.onIdle, "trigger");
        });
      }, minIdleMs);
    };

    const events = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [triggers]);
}
