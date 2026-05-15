"use client";

import { useEffect } from "react";
import { firePeblorAction } from "@/peblor/triggers";
import type { PeblorAction } from "@pb/contracts/types";

export type KeyboardTriggerDef = {
  /** Key value matching `event.key` (e.g. "ArrowRight", "Space", "Enter", "Escape", "a") */
  key: string;
  /** Optional modifier keys */
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  /** Action to fire on keydown */
  onKeyDown?: PeblorAction;
  /** Action to fire on keyup */
  onKeyUp?: PeblorAction;
  /** Prevent default browser behavior for this key */
  preventDefault?: boolean;
};

/**
 * Registers global keyboard listeners that fire peblor actions.
 * Mount once per page or section. Triggers are active while component is mounted.
 */
export function useKeyboardTrigger(triggers: KeyboardTriggerDef[]): void {
  useEffect(() => {
    if (!triggers || triggers.length === 0) return;

    const matchModifiers = (def: KeyboardTriggerDef, e: KeyboardEvent): boolean => {
      if (def.shift !== undefined && e.shiftKey !== def.shift) return false;
      if (def.ctrl !== undefined && e.ctrlKey !== def.ctrl) return false;
      if (def.alt !== undefined && e.altKey !== def.alt) return false;
      if (def.meta !== undefined && e.metaKey !== def.meta) return false;
      return true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
        return;
      for (const def of triggers) {
        if (e.key === def.key && matchModifiers(def, e)) {
          if (def.preventDefault) e.preventDefault();
          if (def.onKeyDown) firePeblorAction(def.onKeyDown, "trigger");
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
        return;
      for (const def of triggers) {
        if (e.key === def.key && matchModifiers(def, e)) {
          if (def.onKeyUp) firePeblorAction(def.onKeyUp, "trigger");
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [triggers]);
}
