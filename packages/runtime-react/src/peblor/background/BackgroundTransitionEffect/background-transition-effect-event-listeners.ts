"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    const handler = (e: CustomEvent<{ forward?: boolean; id?: string }>) => {
      const normalizedTransitionId = normalizeTransitionEventId(transitionId);
      const normalizedEventId = normalizeTransitionEventId(e.detail?.id);
      if (!normalizedTransitionId || !normalizedEventId) return;
      if (normalizedTransitionId !== normalizedEventId) return;

      const forward = e.detail?.forward ?? true;

      if (effect.type === "TRIGGER") {
        if (!forward && isForward && transitionStarted) {
          setCurrentTriggerProgress(1);
        } else if (forward && !isForward && transitionStarted) {
          setCurrentTriggerProgress(0);
        } else if (!transitionStarted) {
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
      if (reverseCompleteTimeoutRef.current) clearTimeout(reverseCompleteTimeoutRef.current);
    };
  }, [
    transitionId,
    effect.type,
    isForward,
    transitionStarted,
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

    const handler = (e: CustomEvent<{ progress?: number; id?: string }>) => {
      const normalizedTransitionId = normalizeTransitionEventId(transitionId);
      const normalizedEventId = normalizeTransitionEventId(e.detail?.id);
      if (!normalizedTransitionId || !normalizedEventId) return;
      if (normalizedTransitionId !== normalizedEventId) return;

      if (e.detail.progress != null && e.detail.progress !== lastProgressRef.current) {
        lastProgressRef.current = e.detail.progress;
        setProgress(e.detail.progress);
      }
    };

    window.addEventListener("update-transition-progress", handler as EventListener);
    return () => window.removeEventListener("update-transition-progress", handler as EventListener);
  }, [effect.type, transitionId, setProgress, lastProgressRef]);
}
