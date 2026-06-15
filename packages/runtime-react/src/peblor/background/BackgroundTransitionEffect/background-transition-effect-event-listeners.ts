"use client";

import { useEffect, useRef, useInsertionEffect } from "react";
import type { BackgroundTransitionEffect } from "@pb/contracts/types";

export function normalizeTransitionEventId(id: string | undefined): string | null {
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type StartListenerParams = {
  effect: BackgroundTransitionEffect;
  transitionId: string;
  isForward: boolean;
  transitionStarted: boolean;
  reverseCompleteTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setIsForward: (value: boolean) => void;
  setTransitionStarted: (value: boolean) => void;
  setCurrentTriggerProgress: (value: number) => void;
};

export function useBackgroundTransitionStartListener({
  effect,
  transitionId,
  isForward,
  transitionStarted,
  reverseCompleteTimeoutRef,
  setIsForward,
  setTransitionStarted,
  setCurrentTriggerProgress,
}: StartListenerParams) {
  // Store isForward and transitionStarted in refs so the listener closure
  // always reads the latest values without tearing down and re-registering
  // the window listener on every state change. This prevents dropping rapid
  // sequential events dispatched during the re-registration gap.
  const isForwardRef = useRef(isForward);
  const transitionStartedRef = useRef(transitionStarted);
  useInsertionEffect(() => {
    isForwardRef.current = isForward;
    transitionStartedRef.current = transitionStarted;
  });

  useEffect(() => {
    const handler = (e: CustomEvent<{ forward?: boolean; id?: string }>) => {
      const normalizedTransitionId = normalizeTransitionEventId(transitionId);
      const normalizedEventId = normalizeTransitionEventId(e.detail?.id);
      if (!normalizedTransitionId || !normalizedEventId) return;
      if (normalizedTransitionId !== normalizedEventId) return;

      const forward = e.detail?.forward ?? true;

      if (effect.type === "TRIGGER") {
        if (!forward && isForwardRef.current && transitionStartedRef.current) {
          setCurrentTriggerProgress(1);
        } else if (forward && !isForwardRef.current && transitionStartedRef.current) {
          setCurrentTriggerProgress(0);
        } else if (!transitionStartedRef.current) {
          setCurrentTriggerProgress(0);
        }
      }

      setIsForward(forward);
      setTransitionStarted(true);

      if (reverseCompleteTimeoutRef.current) {
        clearTimeout(reverseCompleteTimeoutRef.current);
        reverseCompleteTimeoutRef.current = null;
      }
    };

    window.addEventListener("start-background-transition", handler as EventListener);
    return () => {
      window.removeEventListener("start-background-transition", handler as EventListener);
    };
  }, [
    transitionId,
    effect.type,
    setIsForward,
    setTransitionStarted,
    setCurrentTriggerProgress,
    reverseCompleteTimeoutRef,
  ]);
}

type ProgressListenerParams = {
  effect: BackgroundTransitionEffect;
  transitionId: string;
  lastProgressRef: React.MutableRefObject<number | null>;
  setProgress: (value: number) => void;
};

export function useBackgroundTransitionProgressListener({
  effect,
  transitionId,
  lastProgressRef,
  setProgress,
}: ProgressListenerParams) {
  useEffect(() => {
    if (effect.type !== "SCROLL") return;

    let rafId: number | null = null;
    let pendingProgress: number | null = null;

    const handler = (e: CustomEvent<{ progress?: number; id?: string }>) => {
      const normalizedTransitionId = normalizeTransitionEventId(transitionId);
      const normalizedEventId = normalizeTransitionEventId(e.detail?.id);
      if (!normalizedTransitionId || !normalizedEventId) return;
      if (normalizedTransitionId !== normalizedEventId) return;

      const progress = e.detail.progress;
      if (progress == null || progress === lastProgressRef.current) return;
      lastProgressRef.current = progress;
      pendingProgress = progress;

      // Gate setProgress behind a single rAF so we don't schedule React
      // reconciliation on every scroll tick (~60/s). If a frame is already
      // scheduled, just update the pending value for the next callback.
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (pendingProgress !== null) {
            setProgress(pendingProgress);
            pendingProgress = null;
          }
        });
      }
    };

    window.addEventListener("update-transition-progress", handler as EventListener);
    return () => {
      window.removeEventListener("update-transition-progress", handler as EventListener);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [effect.type, transitionId, setProgress, lastProgressRef]);
}
