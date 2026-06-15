"use client";

import { useEffect, useLayoutEffect, useRef, useCallback } from "react";
import type { SectionBlock } from "@pb/contracts/types";
import { useSectionBaseStyles } from "@/peblor/section/position/use-section-base-styles";
import { firePeblorTrigger, firePeblorProgressTrigger } from "./core/trigger-event";
import { useSectionScrollProgress } from "@/peblor/section/position/use-section-scroll-progress";
import { useSectionCustomTriggers } from "@/peblor/triggers/core/use-section-custom-triggers";
import { SectionMotionWrapper } from "@/peblor/integrations/framer-motion";

type Props = Extract<SectionBlock, { type: "sectionTrigger" }>;

export function PageTrigger({
  id,
  onVisible,
  onInvisible,
  onProgress,
  onViewportProgress,
  threshold = 0,
  triggerOnce = false,
  rootMargin,
  delay,
  width,
  height = "1px",
  selfAlign,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  initialX,
  initialY,
  motion: motionFromJson,
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
  const sentinelRef = useRef<HTMLElement>(null);
  const hasFiredVisibleOnce = useRef(false);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastViewportProgressRef = useRef<number | null>(null);
  const hasVisibleTrigger = onVisible != null;
  const hasInvisibleTrigger = onInvisible != null;
  const hasViewportProgressTrigger = onViewportProgress != null;
  const onVisibleRef = useRef(onVisible);
  const onInvisibleRef = useRef(onInvisible);
  const onViewportProgressRef = useRef(onViewportProgress);

  useLayoutEffect(() => {
    onVisibleRef.current = onVisible;
    onInvisibleRef.current = onInvisible;
    onViewportProgressRef.current = onViewportProgress;
  }, [onVisible, onInvisible, onViewportProgress]);

  const fireVisibleAction = useCallback(() => {
    if (onVisibleRef.current) firePeblorTrigger(true, onVisibleRef.current, id);
  }, [id]);
  const fireInvisibleAction = useCallback(() => {
    if (onInvisibleRef.current) firePeblorTrigger(false, onInvisibleRef.current, id);
  }, [id]);
  const fireViewportProgressAction = useCallback(
    (ratio: number) => {
      if (onViewportProgressRef.current)
        firePeblorProgressTrigger(ratio, onViewportProgressRef.current, id);
    },
    [id]
  );

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

  // Handle scroll progress tracking
  useSectionScrollProgress({
    sectionRef: sentinelRef,
    onProgress: onProgress
      ? (progress) => {
          firePeblorProgressTrigger(progress, onProgress, id);
        }
      : undefined,
  });

  const { baseStyle, parallaxY } = useSectionBaseStyles({
    fill: undefined,
    layers: undefined,
    effects: undefined,
    width,
    height,
    selfAlign,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    borderRadius: undefined,
    border: undefined,
    scrollSpeed: 1,
    initialX,
    initialY,
    sectionRef: sentinelRef,
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (
      !el ||
      (!hasVisibleTrigger && !hasInvisibleTrigger && !onProgress && !hasViewportProgressTrigger)
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (hasViewportProgressTrigger) {
            const ratio = entry.intersectionRatio;
            if (
              lastViewportProgressRef.current === null ||
              Math.abs(ratio - lastViewportProgressRef.current) > 0.001
            ) {
              lastViewportProgressRef.current = ratio;
              fireViewportProgressAction(ratio);
            }
          }

          const visible = entry.isIntersecting;

          if (pendingTimeout.current != null) {
            clearTimeout(pendingTimeout.current);
            pendingTimeout.current = null;
          }

          if (visible) {
            if (hasVisibleTrigger) {
              if (triggerOnce && hasFiredVisibleOnce.current) return;
              if (triggerOnce) hasFiredVisibleOnce.current = true;
              const ms = delay ?? 0;
              if (ms > 0) {
                pendingTimeout.current = setTimeout(() => {
                  pendingTimeout.current = null;
                  fireVisibleAction();
                }, ms);
              } else {
                fireVisibleAction();
              }
            }
          } else {
            if (hasInvisibleTrigger) {
              const ms = delay ?? 0;
              if (ms > 0) {
                pendingTimeout.current = setTimeout(() => {
                  pendingTimeout.current = null;
                  fireInvisibleAction();
                }, ms);
              } else {
                fireInvisibleAction();
              }
            }
          }
        }
      },
      {
        threshold: hasViewportProgressTrigger
          ? Array.from({ length: 21 }, (_, i) => i / 20)
          : threshold,
        rootMargin: rootMargin ?? undefined,
      }
    );

    observer.observe(el);
    return () => {
      if (pendingTimeout.current != null) clearTimeout(pendingTimeout.current);
      observer.disconnect();
      hasFiredVisibleOnce.current = false;
      lastViewportProgressRef.current = null;
    };
  }, [
    id,
    onProgress,
    threshold,
    triggerOnce,
    rootMargin,
    delay,
    hasVisibleTrigger,
    hasInvisibleTrigger,
    hasViewportProgressTrigger,
    fireVisibleAction,
    fireInvisibleAction,
    fireViewportProgressAction,
  ]);

  return (
    <SectionMotionWrapper
      sectionRef={sentinelRef}
      motion={motionFromJson}
      parallaxY={parallaxY}
      className="pointer-events-none invisible shrink-0"
      style={{ ...baseStyle, visibility: "hidden", minHeight: 0 }}
      aria-hidden
    >
      {null}
    </SectionMotionWrapper>
  );
}
