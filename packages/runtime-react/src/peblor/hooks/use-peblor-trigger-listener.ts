"use client";

import { useEffect, useRef } from "react";
import type { bgBlock } from "@pb/contracts/types";
import type { BackgroundTransitionEffect } from "@pb/contracts/types";
import type { OverridesMap } from "@pb/core/overrides";
import { createTriggerHandlers, type TriggerHandlerContext } from "@pb/core/triggers";
import { PEBLOR_TRIGGER_EVENT, type PeblorTriggerDetail } from "@/peblor/triggers";

export type UsePeblorTriggerListenerParams = {
  setOverrides: React.Dispatch<React.SetStateAction<OverridesMap>>;
  setActiveTransitionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setReversingTransitionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setTransitionProgress: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  resolvedBg: bgBlock | null;
  bgDefinitions?: Record<string, bgBlock>;
  transitionsArray: BackgroundTransitionEffect[];
};

function dispatchStart(transitionId: string, forward: boolean) {
  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent("start-background-transition", {
        detail: { forward, id: transitionId },
      })
    );
  });
}

function dispatchUpdateProgress(transitionId: string, progressValue: number) {
  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent("update-transition-progress", {
        detail: { progress: progressValue, id: transitionId },
      })
    );
  });
}

export function usePeblorTriggerListener(params: UsePeblorTriggerListenerParams): void {
  const {
    setOverrides,
    setActiveTransitionIds,
    setReversingTransitionIds,
    setTransitionProgress,
    resolvedBg,
    bgDefinitions,
    transitionsArray,
  } = params;
  const lastProgressRef = useRef<number | null>(null);
  const lastTriggerTimeRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const ctx: TriggerHandlerContext = {
      setOverrides,
      setActiveTransitionIds,
      setReversingTransitionIds,
      setTransitionProgress,
      resolvedBg,
      bgDefinitions,
      transitionsArray,
      lastProgressRef,
      lastTriggerTimeRef,
      dispatchStart,
      dispatchUpdateProgress,
    };
    const handlers = createTriggerHandlers(ctx);
    const handler = (e: CustomEvent<PeblorTriggerDetail>) => {
      const { action, progress } = e.detail ?? {};
      if (!action) return;
      const { type } = action;
      const fn = handlers[type];
      if (fn) fn(action, progress ?? null);
    };
    window.addEventListener(PEBLOR_TRIGGER_EVENT, handler as EventListener);
    return () => window.removeEventListener(PEBLOR_TRIGGER_EVENT, handler as EventListener);
  }, [
    setOverrides,
    setActiveTransitionIds,
    setReversingTransitionIds,
    setTransitionProgress,
    resolvedBg,
    bgDefinitions,
    transitionsArray,
  ]);
}
