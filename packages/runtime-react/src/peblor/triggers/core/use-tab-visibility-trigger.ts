"use client";

import { useEffect } from "react";
import type { PeblorAction } from "@pb/contracts/types";
import { firePeblorAction } from "./trigger-event";

export type TabVisibilityTriggerDef = {
  onFocus?: PeblorAction;
  onBlur?: PeblorAction;
};

export function useTabVisibilityTrigger(defs: TabVisibilityTriggerDef[]): void {
  useEffect(() => {
    if (!defs || defs.length === 0) return;

    const handler = () => {
      const hidden = document.hidden;
      for (const def of defs) {
        if (!hidden && def.onFocus) firePeblorAction(def.onFocus, "trigger");
        if (hidden && def.onBlur) firePeblorAction(def.onBlur, "trigger");
      }
    };

    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [defs]);
}
