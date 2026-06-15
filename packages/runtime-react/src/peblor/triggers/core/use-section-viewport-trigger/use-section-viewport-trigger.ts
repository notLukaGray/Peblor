"use client";

import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { firePeblorProgressTrigger, firePeblorTrigger } from "@/peblor/triggers";
import { useSectionScrollProgress } from "@/peblor/section/position/use-section-scroll-progress";
import { useScrollContainer } from "@/peblor/section/position/use-scroll-container";
import {
  getEntryProgress,
  getViewportObserverThresholds,
  shouldFire,
} from "./viewport-trigger-decisions";
import type {
  NormalizedTriggerConfig,
  SectionViewportTriggerOptions,
  ViewportTriggerState,
} from "./viewport-trigger-types";

export function useSectionViewportTrigger(
  ref: RefObject<HTMLElement | null>,
  options: SectionViewportTriggerOptions
): void {
  const {
    onVisible,
    onInvisible,
    onProgress,
    onViewportProgress,
    threshold = 0,
    triggerOnce = false,
    rootMargin,
    delay = 0,
  } = options;

  const stateRef = useRef<ViewportTriggerState>({
    lastFiredState: null,
    hasFiredVisibleOnce: false,
    hasFiredInvisibleOnce: false,
  });
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastViewportProgressRef = useRef<number | null>(null);
  const hasVisibleTrigger = onVisible != null;
  const hasInvisibleTrigger = onInvisible != null;
  const hasViewportProgressTrigger = onViewportProgress != null;
  const fireVisibleAction = useEffectEvent(() => {
    if (onVisible) firePeblorTrigger(true, onVisible);
  });
  const fireInvisibleAction = useEffectEvent(() => {
    if (onInvisible) firePeblorTrigger(false, onInvisible);
  });
  const fireViewportProgressAction = useEffectEvent((progress: number) => {
    if (onViewportProgress) firePeblorProgressTrigger(progress, onViewportProgress);
  });
  const observerRoot = useScrollContainer();

  useSectionScrollProgress({
    sectionRef: ref,
    onProgress: onProgress
      ? (progress) => firePeblorProgressTrigger(progress, onProgress)
      : undefined,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || (!hasVisibleTrigger && !hasInvisibleTrigger && !hasViewportProgressTrigger)) {
      return;
    }
    const state = stateRef.current;

    const config: NormalizedTriggerConfig = {
      onVisible: hasVisibleTrigger ? { type: "__present__" } : undefined,
      onInvisible: hasInvisibleTrigger ? { type: "__present__" } : undefined,
      onProgress,
      onViewportProgress: hasViewportProgressTrigger ? { type: "__present__" } : undefined,
      threshold,
      triggerOnce,
      rootMargin,
      delay,
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (hasViewportProgressTrigger) {
            const viewportProgress = getEntryProgress(entry);
            if (
              lastViewportProgressRef.current === null ||
              Math.abs(viewportProgress - lastViewportProgressRef.current) > 0.001
            ) {
              lastViewportProgressRef.current = viewportProgress;
              fireViewportProgressAction(viewportProgress);
            }
          }

          const { fireVisible, fireInvisible } = shouldFire(entry, config, state);
          if (!fireVisible && !fireInvisible) continue;

          if (pendingTimeout.current != null) {
            clearTimeout(pendingTimeout.current);
            pendingTimeout.current = null;
          }

          const fire = () => {
            pendingTimeout.current = null;
            if (fireVisible) {
              state.lastFiredState = true;
              state.hasFiredVisibleOnce = true;
              fireVisibleAction();
              return;
            }

            state.lastFiredState = false;
            state.hasFiredInvisibleOnce = true;
            fireInvisibleAction();
          };

          if (delay > 0) {
            pendingTimeout.current = setTimeout(fire, delay);
          } else {
            fire();
          }
        }
      },
      {
        threshold: getViewportObserverThresholds(hasViewportProgressTrigger, threshold),
        root: observerRoot ?? null,
        rootMargin: rootMargin ?? undefined,
      }
    );

    observer.observe(el);
    return () => {
      if (pendingTimeout.current != null) clearTimeout(pendingTimeout.current);
      observer.disconnect();
      state.lastFiredState = null;
      state.hasFiredInvisibleOnce = false;
      lastViewportProgressRef.current = null;
    };
  }, [
    ref,
    onProgress,
    threshold,
    triggerOnce,
    rootMargin,
    observerRoot,
    delay,
    hasVisibleTrigger,
    hasInvisibleTrigger,
    hasViewportProgressTrigger,
  ]);
}
