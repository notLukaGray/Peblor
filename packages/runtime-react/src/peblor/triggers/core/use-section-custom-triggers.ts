"use client";

import {
  useKeyboardTrigger,
  useTimerTrigger,
  useCursorTrigger,
  useScrollDirectionTrigger,
  useIdleTrigger,
} from "@/peblor/triggers";
import type {
  KeyboardTriggerDef,
  TimerTriggerDef,
  CursorTriggerDef,
  ScrollDirectionTriggerDef,
  IdleTriggerDef,
} from "@/peblor/triggers";

type SectionCustomTriggersProps = {
  keyboardTriggers?: KeyboardTriggerDef[];
  timerTriggers?: TimerTriggerDef[];
  cursorTriggers?: CursorTriggerDef[];
  scrollDirectionTriggers?: ScrollDirectionTriggerDef[];
  idleTriggers?: IdleTriggerDef[];
};

/**
 * Wires up all five custom trigger hooks for a section component.
 * Call this in every section that extends baseSectionPropsSchema so that
 * keyboardTriggers, timerTriggers, cursorTriggers, scrollDirectionTriggers,
 * and idleTriggers are active whenever the section is mounted — not only when
 * a dedicated sectionTrigger sentinel is used.
 */
export function useSectionCustomTriggers({
  keyboardTriggers,
  timerTriggers,
  cursorTriggers,
  scrollDirectionTriggers,
  idleTriggers,
}: SectionCustomTriggersProps): void {
  useKeyboardTrigger((keyboardTriggers ?? []) as Parameters<typeof useKeyboardTrigger>[0]);
  useTimerTrigger((timerTriggers ?? []) as Parameters<typeof useTimerTrigger>[0]);
  useCursorTrigger((cursorTriggers ?? []) as Parameters<typeof useCursorTrigger>[0]);
  useScrollDirectionTrigger(
    (scrollDirectionTriggers ?? []) as Parameters<typeof useScrollDirectionTrigger>[0]
  );
  useIdleTrigger((idleTriggers ?? []) as Parameters<typeof useIdleTrigger>[0]);
}
