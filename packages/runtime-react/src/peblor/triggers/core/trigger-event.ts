"use client";

import type { PeblorAction } from "@pb/contracts/types";
import { useActionLogStore } from "@/peblor/runtime/peblor-variable-store";
import { routeElementAction } from "../action-bus";

/** Event dispatched by triggers; renderer applies contentOverride, backgroundSwitch, etc. */
export const PEBLOR_TRIGGER_EVENT = "peblor-trigger";

export type PeblorTriggerDetail = {
  triggerId?: string;
  visible?: boolean;
  progress?: number; // 0-1 scroll progress through section
  source?: "button" | "trigger" | "system";
  event?: Record<string, unknown>;
  action: PeblorAction;
};

export function firePeblorTrigger(
  visible: boolean,
  action: PeblorAction,
  triggerId?: string
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PeblorTriggerDetail>(PEBLOR_TRIGGER_EVENT, {
      detail: { triggerId, visible, action },
    })
  );
}

export function firePeblorProgressTrigger(
  progress: number,
  action: PeblorAction,
  triggerId?: string
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PeblorTriggerDetail>(PEBLOR_TRIGGER_EVENT, {
      detail: { triggerId, progress, action },
    })
  );
}

export function firePeblorAction(
  action: PeblorAction,
  source: PeblorTriggerDetail["source"] = "system",
  event?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  // Direct route to element subscriber when a specific id is targeted.
  // routeElementAction returns true if handled — skip the window broadcast.
  if (routeElementAction(action)) {
    if (process.env.NODE_ENV === "development") {
      useActionLogStore.getState().push({
        type: action.type,
        payload: action.payload,
        timestamp: Date.now(),
        source,
      });
    }
    return;
  }
  window.dispatchEvent(
    new CustomEvent<PeblorTriggerDetail>(PEBLOR_TRIGGER_EVENT, {
      detail: { action, source, event },
    })
  );
  if (process.env.NODE_ENV === "development") {
    useActionLogStore.getState().push({
      type: action.type,
      payload: action.payload,
      timestamp: Date.now(),
      source,
    });
  }
}
