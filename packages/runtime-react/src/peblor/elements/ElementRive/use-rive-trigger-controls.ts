"use client";

import { useEffect } from "react";
import { PEBLOR_TRIGGER_EVENT, type PeblorTriggerDetail } from "@/peblor/triggers";
import type { RiveAction } from "@pb/contracts/types";
import type { Rive } from "@/peblor/integrations/rive";

type UseRiveTriggerControlsArgs = {
  /** Element id — used to match payload.id for targeted actions. */
  id?: string;
  /** Ref to the raw Rive instance forwarded from RivePlayer. */
  riveRef: React.MutableRefObject<Rive | null>;
  /** State machine name currently active (needed to look up inputs). */
  stateMachine?: string;
};

function readTargetId(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && "id" in payload) {
    const v = (payload as Record<string, unknown>).id;
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function readInputName(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && "input" in payload) {
    const v = (payload as Record<string, unknown>).input;
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function readInputValue(payload: unknown): boolean | number | undefined {
  if (payload && typeof payload === "object" && "value" in payload) {
    const v = (payload as Record<string, unknown>).value;
    if (typeof v === "boolean" || typeof v === "number") return v;
  }
  return undefined;
}

function matchesId(elementId: string | undefined, targetId: string | undefined): boolean {
  if (!targetId) {
    // No target id in payload — broadcast; matches any element.
    return true;
  }
  return elementId === targetId;
}

export function useRiveTriggerControls({
  id,
  riveRef,
  stateMachine,
}: UseRiveTriggerControlsArgs): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<PeblorTriggerDetail>).detail;
      const action = detail?.action;
      if (!action || typeof action.type !== "string" || !action.type.startsWith("rive.")) return;

      const riveAction = action as RiveAction;
      const payload = riveAction.payload as Record<string, unknown> | undefined;
      const targetId = readTargetId(payload);

      if (!matchesId(id, targetId)) return;

      const rive = riveRef.current;
      if (!rive) return;

      switch (riveAction.type) {
        case "rive.setInput": {
          const inputName = readInputName(payload);
          if (!inputName || !stateMachine) return;
          try {
            const inputs = rive.stateMachineInputs(stateMachine);
            const input = inputs?.find((i) => i.name === inputName);
            if (!input) return;
            const value = readInputValue(payload);
            if (value !== undefined) {
              input.value = value;
            }
          } catch {
            // Rive instance may not be in a ready state; ignore.
          }
          return;
        }

        case "rive.fireTrigger": {
          const inputName = readInputName(payload);
          if (!inputName || !stateMachine) return;
          try {
            const inputs = rive.stateMachineInputs(stateMachine);
            const input = inputs?.find((i) => i.name === inputName);
            if (
              input &&
              "fire" in input &&
              typeof (input as { fire?: () => void }).fire === "function"
            ) {
              (input as { fire: () => void }).fire();
            }
          } catch {
            // Ignore.
          }
          return;
        }

        case "rive.play": {
          try {
            const animationName =
              payload && typeof payload.animationName === "string"
                ? payload.animationName
                : undefined;
            if (animationName) {
              rive.play(animationName);
            } else {
              rive.play();
            }
          } catch {
            // Ignore.
          }
          return;
        }

        case "rive.pause": {
          try {
            rive.pause();
          } catch {
            // Ignore.
          }
          return;
        }

        case "rive.reset": {
          try {
            rive.reset();
          } catch {
            // Ignore.
          }
          return;
        }

        default:
          return;
      }
    };

    window.addEventListener(PEBLOR_TRIGGER_EVENT, listener as EventListener);
    return () => window.removeEventListener(PEBLOR_TRIGGER_EVENT, listener as EventListener);
  }, [id, riveRef, stateMachine]);
}
