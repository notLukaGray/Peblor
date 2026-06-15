import type React from "react";
import type { UpdateTransitionProgressAction } from "@pb/contracts/types";
import type { TriggerHandlerContext } from "./context-and-bg-progress";

function shouldDebounce(
  lastTriggerTimeRef: { current: Map<string, number> },
  transitionId: string,
  windowMs: number
): boolean {
  const now = Date.now();
  const lastTrigger = lastTriggerTimeRef.current.get(transitionId);
  if (lastTrigger != null && now - lastTrigger < windowMs) return true;
  lastTriggerTimeRef.current.set(transitionId, now);
  return false;
}

type TransitionControlDeps = Pick<
  TriggerHandlerContext,
  "lastTriggerTimeRef" | "setActiveTransitionIds" | "setReversingTransitionIds" | "dispatchStart"
>;

export function createTransitionControlHandlers({
  lastTriggerTimeRef,
  setActiveTransitionIds,
  setReversingTransitionIds,
  dispatchStart,
}: TransitionControlDeps) {
  const startTransition = (transitionId: string) => {
    if (shouldDebounce(lastTriggerTimeRef, `start:${transitionId}`, 500)) return;

    setReversingTransitionIds((revPrev) => {
      if (revPrev.has(transitionId)) {
        const revNext = new Set(revPrev);
        revNext.delete(transitionId);
        return revNext;
      }
      return revPrev;
    });

    setActiveTransitionIds((prev) => {
      if (prev.has(transitionId)) return prev;
      const next = new Set(prev);
      next.add(transitionId);
      return next;
    });

    dispatchStart(transitionId, true);
  };

  const stopTransition = (transitionId: string) => {
    if (shouldDebounce(lastTriggerTimeRef, `stop:${transitionId}`, 500)) return;
    setReversingTransitionIds((revPrev) => {
      if (revPrev.has(transitionId)) return revPrev;
      const revNext = new Set(revPrev);
      revNext.add(transitionId);
      return revNext;
    });
    dispatchStart(transitionId, false);
  };

  return { startTransition, stopTransition };
}

export function createUpdateTransitionProgressHandler(
  setTransitionProgress: React.Dispatch<React.SetStateAction<Map<string, number>>>,
  dispatchUpdateProgress: (transitionId: string, progressValue: number) => void
) {
  return (action: UpdateTransitionProgressAction, fallbackProgress: number) => {
    const { id: transitionId, progress, invert } = action.payload;
    const progressValue = progress ?? fallbackProgress;
    if (!transitionId || !Number.isFinite(progressValue)) return;
    const mapped = invert ? 1 - progressValue : progressValue;
    const clamped = Math.max(0, Math.min(1, mapped));
    setTransitionProgress((prev) => {
      const next = new Map(prev);
      next.set(transitionId, clamped);
      return next;
    });
    dispatchUpdateProgress(transitionId, clamped);
  };
}
