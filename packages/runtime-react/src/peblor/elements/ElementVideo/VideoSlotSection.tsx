"use client";

import { useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import { ModuleSlotSection } from "@/peblor/elements/ElementModule/ModuleSlotSection";
import type { ModuleSlotConfig } from "@/peblor/elements/ElementModule/types";
import { useVideoControlContext, type FeedbackType } from "./VideoControlContext";

export type VideoSlotConfig = ModuleSlotConfig;

function stateMatches(
  state: string,
  showControls: boolean,
  isPlaying: boolean,
  isMuted: boolean,
  isFullscreen: boolean
): boolean {
  switch (state) {
    case "awake":
      return showControls;
    case "sleeping":
      return !showControls;
    case "assetPlaying":
      return isPlaying;
    case "assetPaused":
      return !isPlaying;
    case "assetMuted":
      return isMuted;
    case "assetUnmuted":
      return !isMuted;
    case "videoFullscreen":
      return isFullscreen;
    case "videoContained":
      return !isFullscreen;
    default:
      return false;
  }
}

function stateMatchesCompound(
  state: string,
  showControls: boolean,
  isPlaying: boolean,
  isMuted: boolean,
  isFullscreen: boolean
): boolean {
  const parts = state.split(",").map((s) => s.trim());
  return parts.every((p) => stateMatches(p, showControls, isPlaying, isMuted, isFullscreen));
}

function slotIsVisible(
  slot: ModuleSlotConfig,
  showControls: boolean,
  isPlaying: boolean,
  isMuted: boolean,
  isFullscreen: boolean
): boolean {
  const v = slot.visibleWhen;
  if (!v || v === "always") return true;
  if (!Array.isArray(v) || v.length === 0) return true;
  return v.some((s) => stateMatchesCompound(s, showControls, isPlaying, isMuted, isFullscreen));
}

export function VideoSlotSection({
  slot,
  slotKey: _slotKey,
  showControls,
  isPlaying,
  isMuted,
  isFullscreen,
  defaultTransitionMs,
  defaultTransitionEasing,
  pointerEventsWhenVisible,
  slotStyleOverride,
  debugSlotKey,
}: {
  slot: VideoSlotConfig;
  slotKey: string;
  showControls: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  defaultTransitionMs?: number;
  defaultTransitionEasing?: string;
  /** When "auto", slot uses pointer-events: auto when visible (e.g. in transformInherit: "disable" layer). */
  pointerEventsWhenVisible?: "auto";
  /** Optional style override for the slot (e.g. fullscreen bottom bar full width). */
  slotStyleOverride?: CSSProperties;
  /** For console logs only; which slot key (e.g. bottomBar). */
  debugSlotKey?: string;
}) {
  const videoCtx = useVideoControlContext();

  const isSlotVisible = useMemo(
    () => slotIsVisible(slot, showControls, isPlaying, isMuted, isFullscreen),
    [slot, showControls, isPlaying, isMuted, isFullscreen]
  );

  const useHugLayout = useMemo(
    () =>
      slot.layoutMode === "hug" &&
      !!slot.layoutModeWhen &&
      stateMatchesCompound(slot.layoutModeWhen, showControls, isPlaying, isMuted, isFullscreen),
    [slot.layoutMode, slot.layoutModeWhen, showControls, isPlaying, isMuted, isFullscreen]
  );

  const resolveShowWhen = useCallback(
    (showWhen: string | undefined) => videoCtx?.resolveShowWhen(showWhen) ?? true,
    [videoCtx]
  );

  const getActionHandler = useCallback(
    (action: string | undefined, payload?: number) => videoCtx?.getActionHandler(action, payload),
    [videoCtx]
  );

  if (!videoCtx) return null;

  return (
    <ModuleSlotSection
      slot={slot}
      isSlotVisible={isSlotVisible}
      useHugLayout={useHugLayout}
      resolveShowWhen={resolveShowWhen}
      getActionHandler={getActionHandler}
      feedback={videoCtx.feedback}
      showFeedback={(t) => videoCtx.showFeedback(t as FeedbackType)}
      defaultTransitionMs={defaultTransitionMs}
      defaultTransitionEasing={defaultTransitionEasing}
      pointerEventsWhenVisible={pointerEventsWhenVisible}
      slotStyleOverride={slotStyleOverride}
      debugSlotKey={debugSlotKey}
    />
  );
}
