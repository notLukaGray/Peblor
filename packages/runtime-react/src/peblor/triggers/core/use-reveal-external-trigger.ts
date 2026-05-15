"use client";

import { useEffect } from "react";
import { PEBLOR_TRIGGER_EVENT } from "./trigger-event";
import type { PeblorTriggerDetail } from "./trigger-event";

export type RevealExternalTriggerMode = "setTrue" | "setFalse" | "toggle";

/**
 * Subscribes to peblor trigger events and updates revealed state when a contentOverride
 * action targets this section's externalTriggerKey. Use for revealSection with triggerMode
 * "external" or "combined".
 */
export function useRevealExternalTrigger(
  externalTriggerKey: string | undefined,
  externalTriggerMode: RevealExternalTriggerMode | undefined,
  setRevealed: (value: boolean | ((prev: boolean) => boolean)) => void
): void {
  useEffect(() => {
    if (!externalTriggerKey || !externalTriggerMode) return;

    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<PeblorTriggerDetail>).detail;
      if (!detail?.action || detail.action.type !== "contentOverride") return;
      if (detail.action.payload.key !== externalTriggerKey) return;

      const value = detail.action.payload.value;
      const boolValue = value === true || value === "true";

      if (externalTriggerMode === "setTrue") {
        if (boolValue) setRevealed(true);
      } else if (externalTriggerMode === "setFalse") {
        if (!boolValue) setRevealed(false);
      } else if (externalTriggerMode === "toggle") {
        setRevealed((prev) => !prev);
      }
    };

    window.addEventListener(PEBLOR_TRIGGER_EVENT, handler);
    return () => window.removeEventListener(PEBLOR_TRIGGER_EVENT, handler);
  }, [externalTriggerKey, externalTriggerMode, setRevealed]);
}
