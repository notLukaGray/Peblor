"use client";

import { useMemo } from "react";
import { AnimatePresence } from "@/peblor/integrations/framer-motion";
import type { ModalTransitionConfig } from "@pb/core/modal";
import type { MotionPropsFromJson } from "@pb/contracts/types";
import {
  MOTION_DEFAULTS,
  mergeMotionDefaults,
} from "@pb/contracts/peblor/core/peblor-motion-defaults";
import { MotionFromJson } from "./motion-from-json";

type ModalAnimationWrapperProps = {
  /** Stable key (e.g. modal id) so AnimatePresence can track enter/exit. */
  modalKey: string;
  show: boolean;
  /** From JSON (modal transition); when omitted, use generic transition defaults. */
  transition?: ModalTransitionConfig;
  /** Full FM config from JSON; when set, overrides transition and gives full control. */
  motion?: MotionPropsFromJson;
  children: React.ReactNode;
};

/**
 * Wraps modal content in AnimatePresence + MotionFromJson. Keyframes and transition come from
 * JSON: either full motion config or motionComponent (from motion-defaults) + transition timing.
 */
export function ModalAnimationWrapper({
  modalKey,
  show,
  transition,
  motion: motionFromJson,
  children,
}: ModalAnimationWrapperProps) {
  const fallbackMotion = useMemo((): MotionPropsFromJson => {
    const mc = MOTION_DEFAULTS.motionComponent;
    const t = transition ?? {};
    const enterMs =
      t.enterDurationMs ??
      (MOTION_DEFAULTS.transition.enterDuration ?? MOTION_DEFAULTS.transition.duration) * 1000;
    const exitMs =
      t.exitDurationMs ??
      (MOTION_DEFAULTS.transition.exitDuration ?? MOTION_DEFAULTS.transition.duration) * 1000;
    const ease = t.easing ?? MOTION_DEFAULTS.transition.ease;
    return {
      initial: mc.initial as Record<string, string | number | number[]>,
      animate: {
        ...(mc.animate as Record<string, string | number | number[]>),
        transition: { duration: enterMs / 1000, ease },
      },
      exit: {
        ...(mc.exit as Record<string, string | number | number[]>),
        transition: { duration: exitMs / 1000, ease },
      },
      transition: { duration: exitMs / 1000, ease },
    } as unknown as MotionPropsFromJson;
  }, [transition]);

  const motionConfig =
    motionFromJson && typeof motionFromJson === "object" ? motionFromJson : fallbackMotion;
  const merged = useMemo(() => mergeMotionDefaults(motionConfig) ?? {}, [motionConfig]);

  return (
    <AnimatePresence>
      {show && (
        <MotionFromJson
          key={modalKey}
          motion={merged}
          className="fixed inset-0 z-[var(--pb-z-modal)]"
        >
          {children}
        </MotionFromJson>
      )}
    </AnimatePresence>
  );
}
