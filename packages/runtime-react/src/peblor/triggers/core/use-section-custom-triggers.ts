"use client";

import {
  useKeyboardTrigger,
  useTimerTrigger,
  useCursorTrigger,
  useScrollDirectionTrigger,
  useIdleTrigger,
  useVariableTrigger,
  useTabVisibilityTrigger,
  useMediaEndTrigger,
} from "@/peblor/triggers";
import type {
  KeyboardTriggerDef,
  TimerTriggerDef,
  CursorTriggerDef,
  ScrollDirectionTriggerDef,
  IdleTriggerDef,
  VariableTriggerDef,
  TabVisibilityTriggerDef,
  MediaEndTriggerDef,
} from "@/peblor/triggers";
import { useCustomEventTrigger, type CustomEventTriggerDef } from "./use-custom-event-trigger";
import { useElementEventTrigger, type ElementEventTriggerDef } from "./use-element-event-trigger";
import {
  useScrollThresholdTrigger,
  type ScrollThresholdTriggerDef,
} from "./use-scroll-threshold-trigger";
import {
  useMediaProgressTrigger,
  type MediaProgressTriggerDef,
} from "./use-media-progress-trigger";

type SectionCustomTriggersProps = {
  keyboardTriggers?: KeyboardTriggerDef[];
  timerTriggers?: TimerTriggerDef[];
  cursorTriggers?: CursorTriggerDef[];
  scrollDirectionTriggers?: ScrollDirectionTriggerDef[];
  idleTriggers?: IdleTriggerDef[];
  variableTriggers?: VariableTriggerDef[];
  tabVisibilityTriggers?: TabVisibilityTriggerDef[];
  mediaEndTriggers?: MediaEndTriggerDef[];
  customEventTriggers?: CustomEventTriggerDef[];
  elementEventTriggers?: ElementEventTriggerDef[];
  scrollThresholdTriggers?: ScrollThresholdTriggerDef[];
  mediaProgressTriggers?: MediaProgressTriggerDef[];
};

/**
 * Wires up all custom trigger hooks for a section component.
 * Call this in every section that extends baseSectionPropsSchema.
 */
export function useSectionCustomTriggers({
  keyboardTriggers,
  timerTriggers,
  cursorTriggers,
  scrollDirectionTriggers,
  idleTriggers,
  variableTriggers,
  tabVisibilityTriggers,
  mediaEndTriggers,
  customEventTriggers,
  elementEventTriggers,
  scrollThresholdTriggers,
  mediaProgressTriggers,
}: SectionCustomTriggersProps): void {
  useKeyboardTrigger((keyboardTriggers ?? []) as Parameters<typeof useKeyboardTrigger>[0]);
  useTimerTrigger((timerTriggers ?? []) as Parameters<typeof useTimerTrigger>[0]);
  useCursorTrigger((cursorTriggers ?? []) as Parameters<typeof useCursorTrigger>[0]);
  useScrollDirectionTrigger(
    (scrollDirectionTriggers ?? []) as Parameters<typeof useScrollDirectionTrigger>[0]
  );
  useIdleTrigger((idleTriggers ?? []) as Parameters<typeof useIdleTrigger>[0]);
  useVariableTrigger((variableTriggers ?? []) as Parameters<typeof useVariableTrigger>[0]);
  useTabVisibilityTrigger(
    (tabVisibilityTriggers ?? []) as Parameters<typeof useTabVisibilityTrigger>[0]
  );
  useMediaEndTrigger((mediaEndTriggers ?? []) as Parameters<typeof useMediaEndTrigger>[0]);
  useCustomEventTrigger((customEventTriggers ?? []) as CustomEventTriggerDef[]);
  useElementEventTrigger((elementEventTriggers ?? []) as ElementEventTriggerDef[]);
  useScrollThresholdTrigger((scrollThresholdTriggers ?? []) as ScrollThresholdTriggerDef[]);
  useMediaProgressTrigger((mediaProgressTriggers ?? []) as MediaProgressTriggerDef[]);
}
