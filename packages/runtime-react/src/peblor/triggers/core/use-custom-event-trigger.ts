"use client";

import { useEffect } from "react";
import { firePeblorAction } from "@/peblor/triggers";
import type { CustomEventTriggerDef } from "@pb/contracts/peblor/core/peblor-schemas/section-block-base-schemas";

export type { CustomEventTriggerDef };

export function useCustomEventTrigger(defs: CustomEventTriggerDef[]): void {
  useEffect(() => {
    if (!defs || defs.length === 0) return;
    const handlers: Array<{ name: string; handler: EventListener }> = [];
    for (const def of defs) {
      const handler: EventListener = (e) => {
        firePeblorAction(def.action, "trigger", (e as CustomEvent).detail);
      };
      const eventName = `peblor-custom:${def.name}`;
      window.addEventListener(eventName, handler);
      handlers.push({ name: eventName, handler });
    }
    return () => {
      for (const { name, handler } of handlers) window.removeEventListener(name, handler);
    };
  }, [defs]);
}
