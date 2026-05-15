"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { TriggerAction } from "@pb/contracts/types";
import type { BackgroundTransitionEffect } from "@pb/contracts/types";
import { firePeblorProgressTrigger } from "@/peblor/triggers";
import { usePageScrollProgress } from "@/peblor/hooks/use-page-scroll-progress";

export type UsePeblorTransitionStateParams = {
  transitionsArray: BackgroundTransitionEffect[];
  onPageProgress?: TriggerAction;
};

export type UsePeblorTransitionStateResult = {
  activeTransitionIds: Set<string>;
  reversingTransitionIds: Set<string>;
  transitionProgress: Map<string, number>;
  setActiveTransitionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setReversingTransitionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setTransitionProgress: React.Dispatch<React.SetStateAction<Map<string, number>>>;
};

export function usePeblorTransitionState({
  transitionsArray,
  onPageProgress,
}: UsePeblorTransitionStateParams): UsePeblorTransitionStateResult {
  const [activeTransitionIds, setActiveTransitionIds] = useState<Set<string>>(new Set());
  const [reversingTransitionIds, setReversingTransitionIds] = useState<Set<string>>(new Set());
  const [transitionProgress, setTransitionProgress] = useState<Map<string, number>>(new Map());
  const lastTransitionProgressRef = useRef<Map<string, number>>(new Map());

  const handlePageProgress = useCallback(
    (progress: number) => {
      if (onPageProgress) firePeblorProgressTrigger(progress, onPageProgress);
      transitionsArray.forEach((transition) => {
        if (transition.type === "SCROLL") {
          if (transition.source === "trigger") return;
          const transitionId = transition.id;
          const start = transition.progressRange?.start ?? 0;
          const end = transition.progressRange?.end ?? 1;
          const denom = end - start;
          const mapped = denom > 0 ? (progress - start) / denom : 0;
          const clamped = Math.max(0, Math.min(1, mapped));
          const lastProgress = lastTransitionProgressRef.current.get(transitionId);
          if (lastProgress === undefined || Math.abs(clamped - lastProgress) > 0.001) {
            lastTransitionProgressRef.current.set(transitionId, clamped);
            setTransitionProgress((prev) => {
              const next = new Map(prev);
              next.set(transitionId, clamped);
              return next;
            });
          }
        }
      });
    },
    [transitionsArray, onPageProgress]
  );

  usePageScrollProgress({ onProgress: handlePageProgress });

  useEffect(() => {
    if (transitionsArray.length === 0) return;
    const timeTransitionIds = transitionsArray.filter((t) => t.type === "TIME").map((t) => t.id);
    if (timeTransitionIds.length === 0) return;
    queueMicrotask(() => {
      setActiveTransitionIds((prev) => {
        const next = new Set(prev);
        timeTransitionIds.forEach((id) => next.add(id));
        return next;
      });
    });
    queueMicrotask(() => {
      timeTransitionIds.forEach((id) => {
        window.dispatchEvent(
          new CustomEvent("start-background-transition", {
            detail: { forward: true, id },
          })
        );
      });
    });
  }, [transitionsArray]);

  return {
    activeTransitionIds,
    reversingTransitionIds,
    transitionProgress,
    setActiveTransitionIds,
    setReversingTransitionIds,
    setTransitionProgress,
  };
}
