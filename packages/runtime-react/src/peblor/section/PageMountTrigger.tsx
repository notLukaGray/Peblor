"use client";

import { useEffect, useRef } from "react";
import type { SectionBlock } from "@pb/contracts/types";
import { firePeblorAction } from "@/peblor/triggers";
import { useSectionCustomTriggers } from "@/peblor/triggers/core/use-section-custom-triggers";

type Props = Extract<SectionBlock, { type: "pageTrigger" }>;

export function PageMountTrigger({
  onMount,
  onUnmount,
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
}: Props) {
  useSectionCustomTriggers({
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
  });

  // Capture latest callbacks in a ref so the mount/unmount effect doesn't need
  // them as deps — firing mount actions on prop changes would be wrong.
  const callbacksRef = useRef({ onMount, onUnmount });
  useEffect(() => {
    callbacksRef.current = { onMount, onUnmount };
  });

  useEffect(() => {
    const { onMount: mount } = callbacksRef.current;
    if (mount) firePeblorAction(mount, "trigger");
    return () => {
      const { onUnmount: unmount } = callbacksRef.current;
      if (unmount) firePeblorAction(unmount, "trigger");
    };
  }, []);

  return null;
}
