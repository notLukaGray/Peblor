"use client";

import { useCallback } from "react";
import { ModuleSlotSection } from "@/peblor/elements/ElementModule/ModuleSlotSection";
import type { ModuleSlotConfig } from "@/peblor/elements/ElementModule/types";
import { useAudioControlContext, type FeedbackType } from "./AudioControlContext";

type AudioSlotSectionProps = {
  slot: ModuleSlotConfig;
  isSlotVisible: boolean;
  useHugLayout: boolean;
  pointerEventsWhenVisible?: "auto";
  slotStyleOverride?: React.CSSProperties;
  debugSlotKey?: string;
  defaultTransitionMs?: number;
  defaultTransitionEasing?: string;
};

export function AudioSlotSection({
  slot,
  isSlotVisible,
  useHugLayout,
  pointerEventsWhenVisible,
  slotStyleOverride,
  debugSlotKey,
  defaultTransitionMs,
  defaultTransitionEasing,
}: AudioSlotSectionProps) {
  const ctx = useAudioControlContext();

  const resolveShowWhen = useCallback(
    (showWhen: string | undefined) => ctx?.resolveShowWhen(showWhen) ?? true,
    [ctx]
  );

  const getActionHandler = useCallback(
    (action: string | undefined, payload?: number) => ctx?.getActionHandler(action, payload),
    [ctx]
  );

  if (!ctx) return null;

  return (
    <ModuleSlotSection
      slot={slot}
      isSlotVisible={isSlotVisible}
      useHugLayout={useHugLayout}
      resolveShowWhen={resolveShowWhen}
      getActionHandler={getActionHandler}
      feedback={ctx.feedback}
      showFeedback={(t) => ctx.showFeedback(t as FeedbackType)}
      pointerEventsWhenVisible={pointerEventsWhenVisible}
      slotStyleOverride={slotStyleOverride}
      debugSlotKey={debugSlotKey}
      defaultTransitionMs={defaultTransitionMs}
      defaultTransitionEasing={defaultTransitionEasing}
    />
  );
}
