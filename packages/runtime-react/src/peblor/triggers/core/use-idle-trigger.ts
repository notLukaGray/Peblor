"use client";

import { useEffect, useRef } from "react";
import { firePeblorAction } from "@/peblor/triggers";
import type { PeblorAction } from "@pb/contracts/types";
import { globals } from "@pb/runtime-react/core/lib/globals";

export type IdleTriggerDef = {
  /** Ms of inactivity before firing onIdle. Default 5000. */
  idleAfterMs?: number;
  onIdle?: PeblorAction;
  onActive?: PeblorAction;
};

export function useIdleTrigger(triggers: IdleTriggerDef[]): void {
  const isIdleRef = useRef(false);

  useEffect(() => {
    if (!triggers || triggers.length === 0) return;

    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const resetTimer = () => {
      if (isIdleRef.current) {
        isIdleRef.current = false;
        triggers.forEach((def) => {
          if (def.onActive) firePeblorAction(def.onActive, "trigger");
        });
      }
      timeoutIds.forEach(clearTimeout);
      timeoutIds.length = 0;
      triggers.forEach((def) => {
        const delay = def.idleAfterMs ?? globals.uiIdleAfterMs;
        const id = setTimeout(() => {
          isIdleRef.current = true;
          if (def.onIdle) firePeblorAction(def.onIdle, "trigger");
        }, delay);
        timeoutIds.push(id);
      });
    };

    const events = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      timeoutIds.forEach(clearTimeout);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [triggers]);
}
