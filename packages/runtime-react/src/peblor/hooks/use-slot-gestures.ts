"use client";

import { useRef, useCallback, useEffect } from "react";
import { globals } from "@pb/runtime-react/core/lib/globals";
import { getRegionFromClientX } from "@pb/core/modules";
import { inferSeekFeedbackType } from "@pb/core/modules";
import type { GestureDef } from "@/peblor/elements/ElementModule/types";

export type UseSlotGesturesParams = {
  gestures: GestureDef[] | undefined;
  getActionHandler: (action: string | undefined, payload?: number) => (() => void) | undefined;
  showFeedback?: (type: string) => void;
  slotActionHandler: (() => void) | undefined;
};

export type UseSlotGesturesResult = {
  handlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  hasTapHandler: boolean;
};

function findGestureForRegion(
  gestures: GestureDef[] | undefined,
  region: "left" | "center" | "right"
): GestureDef | undefined {
  return gestures?.find(
    (g) => (g.gesture === "doubleTap" || g.gesture === "hold") && (!g.region || g.region === region)
  );
}

export function useSlotGestures({
  gestures,
  getActionHandler,
  showFeedback,
  slotActionHandler,
}: UseSlotGesturesParams): UseSlotGesturesResult {
  const lastTapRef = useRef<{ time: number; gesture?: GestureDef } | null>(null);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const executeGesture = useCallback(
    (g: GestureDef) => {
      const h = getActionHandler(g.action, g.payload);
      if (h) h();
      const ft =
        g.feedbackType ?? (g.action === "assetSeek" ? inferSeekFeedbackType(g.payload) : undefined);
      if (ft && showFeedback) showFeedback(ft);
    },
    [getActionHandler, showFeedback]
  );

  const getRegionAndGesture = useCallback(
    (clientX: number, el: HTMLElement) => {
      const region = getRegionFromClientX(clientX, el);
      const gesture = findGestureForRegion(gestures, region);
      return { region, gesture };
    },
    [gestures]
  );

  useEffect(
    () => () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button, input")) return;
      e.stopPropagation();
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const { gesture } = getRegionAndGesture(e.clientX, e.currentTarget);
      if (gesture?.action === "assetSeek") {
        holdTimerRef.current = setTimeout(() => {
          holdTimerRef.current = null;
          executeGesture(gesture);
          repeatIntervalRef.current = setInterval(
            () => executeGesture(gesture),
            globals.uiVideoHoldRepeatMs
          );
        }, globals.uiVideoHoldThresholdMs);
      }
    },
    [getRegionAndGesture, executeGesture]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button, input")) return;
      e.stopPropagation();
      e.preventDefault();
      e.currentTarget.releasePointerCapture(e.pointerId);
      const hadHoldTimer = !!holdTimerRef.current;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (repeatIntervalRef.current) {
        clearInterval(repeatIntervalRef.current);
        repeatIntervalRef.current = null;
        return;
      }
      if (hadHoldTimer && (slotActionHandler || (gestures?.length ?? 0) > 0)) {
        const now = Date.now();
        const prev = lastTapRef.current;
        if (prev && now - prev.time < globals.uiVideoDoubleTapThresholdMs) {
          clearTimeout(singleTapTimeoutRef.current ?? undefined);
          singleTapTimeoutRef.current = null;
          lastTapRef.current = null;
          const { gesture } = getRegionAndGesture(e.clientX, e.currentTarget);
          if (gesture?.action === "assetSeek") {
            executeGesture(gesture);
          } else if (slotActionHandler) {
            slotActionHandler();
          }
        } else {
          const { gesture } = getRegionAndGesture(e.clientX, e.currentTarget);
          lastTapRef.current = { time: now, gesture };
          clearTimeout(singleTapTimeoutRef.current ?? undefined);
          singleTapTimeoutRef.current = setTimeout(() => {
            singleTapTimeoutRef.current = null;
            const g = lastTapRef.current?.gesture;
            lastTapRef.current = null;
            if (g?.action === "assetSeek") {
              executeGesture(g);
            } else if (slotActionHandler) {
              slotActionHandler();
            }
          }, globals.uiVideoDoubleTapThresholdMs);
        }
      } else if (slotActionHandler) {
        slotActionHandler();
      }
    },
    [slotActionHandler, gestures?.length, getRegionAndGesture, executeGesture]
  );

  const hasTapHandler = !!(slotActionHandler || (gestures?.length ?? 0) > 0);

  return { handlePointerDown, handlePointerUp, hasTapHandler };
}
