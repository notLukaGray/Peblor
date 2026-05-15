"use client";

import type { UseInViewOptions } from "framer-motion";
import { useRef } from "react";
import { AnimatePresence, MotionFromJson } from "@/peblor/integrations/framer-motion";
import { useInView } from "@/peblor/integrations/framer-motion/viewport";
import { resolveFoundationMotionControls } from "./foundation-motion-policy";
import {
  MOTION_DEFAULTS,
  mergeMotionDefaults,
  getExitMotionFromPreset,
} from "@pb/contracts/peblor/core/peblor-motion-defaults";
import type { MotionPropsFromJson, MotionTiming } from "@pb/contracts/peblor/core/peblor-schemas";

export type ElementExitWrapperProps = {
  /** When false, child unmounts after exit animation. */
  show: boolean;
  /** Optional full motion config from JSON (initial, animate, exit, transition). When set, exit and transition come from here. */
  motion?: MotionPropsFromJson;
  /** Explicit entrance/exit semantics; exitPreset and exitMotion override legacy exitPreset/motion when set. */
  motionTiming?: MotionTiming;
  /** Optional preset name (from framer-motion-presets exitPresets) for exit keyframes. Ignored when motion.exit or motionTiming.exitMotion is set. */
  exitPreset?: string;
  /** Exit duration in seconds. Used when exitPreset is set and motion.transition is not. */
  exitDuration?: number;
  /** Exit easing. Used when exitPreset is set. */
  exitEasing?: string | [number, number, number, number];
  /** Stable unique key for AnimatePresence child. Required when multiple exit wrappers are siblings to avoid shared key bugs. */
  exitKey?: string;
  /** Passed to `AnimatePresence`. Use `"wait"` so exit finishes before the next child enters (avoids stacked layout during remount). */
  presenceMode?: "sync" | "wait" | "popLayout";
  /** Fires when all exit animations in this presence scope have finished. */
  onExitComplete?: () => void;
  /** Optional className applied to the motion wrapper rendered by this component. */
  className?: string;
  /** Optional style applied to the motion wrapper rendered by this component. */
  style?: React.CSSProperties;
  /** When false, ignore OS reduced-motion preference for this element. */
  reduceMotion?: boolean;
  children: React.ReactNode;
};

/**
 * Wraps content in AnimatePresence + MotionFromJson. When presence becomes false, exit animation
 * runs from motion.exit, exitPreset, or motionComponent.exit (motion-defaults).
 *
 * `motionTiming.exitTrigger`:
 * - `manual` (default): presence follows the `show` prop only (parent / dev preview).
 * - `leaveViewport`: after the element has been in view at least once, presence becomes false
 *   when it leaves the intersection root (see `motionTiming.exitViewport`, e.g. margin).
 */
export function ElementExitWrapper({
  show,
  motion: motionFromJson,
  motionTiming,
  exitPreset,
  exitDuration = MOTION_DEFAULTS.transition.exitDuration ?? MOTION_DEFAULTS.transition.duration,
  exitEasing = MOTION_DEFAULTS.transition.ease,
  exitKey = "element-exit",
  presenceMode = "sync",
  onExitComplete,
  className,
  style,
  reduceMotion,
  children,
}: ElementExitWrapperProps) {
  const motionControls = resolveFoundationMotionControls(reduceMotion);
  if (motionControls.disableAll) return show ? <>{children}</> : null;

  const exitTrigger = motionTiming?.exitTrigger ?? "manual";
  const exitVp = motionTiming?.exitViewport;

  const effectiveExitPreset = motionControls.replaceWithFade
    ? "fade"
    : (motionTiming?.exitPreset ?? exitPreset);
  const effectiveExitMotion = motionControls.replaceWithFade
    ? undefined
    : (motionTiming?.exitMotion ?? motionFromJson);
  const exitTransitionOverrides =
    effectiveExitMotion && typeof effectiveExitMotion === "object"
      ? (() => {
          const transition = (effectiveExitMotion as MotionPropsFromJson).transition;
          return transition && typeof transition === "object"
            ? (transition as Record<string, unknown>)
            : undefined;
        })()
      : undefined;
  const resolvedExitDuration =
    (exitTransitionOverrides?.duration as number | undefined) ?? exitDuration;
  const resolvedExitDelay = (exitTransitionOverrides?.delay as number | undefined) ?? 0;
  const resolvedExitEasing =
    (exitTransitionOverrides?.ease as string | [number, number, number, number] | undefined) ??
    exitEasing;

  const motionConfig: MotionPropsFromJson = (() => {
    const hasMotionExit =
      effectiveExitMotion != null &&
      typeof effectiveExitMotion === "object" &&
      (effectiveExitMotion as MotionPropsFromJson)?.exit != null;
    if (hasMotionExit && effectiveExitMotion != null) {
      return (
        mergeMotionDefaults(effectiveExitMotion as MotionPropsFromJson) ??
        ({} as MotionPropsFromJson)
      );
    }
    if (effectiveExitPreset && typeof effectiveExitPreset === "string") {
      const { exit, transition } = getExitMotionFromPreset(effectiveExitPreset, {
        duration: resolvedExitDuration,
        delay: resolvedExitDelay,
        ease: resolvedExitEasing,
      });
      return (
        mergeMotionDefaults({
          initial: ((MOTION_DEFAULTS.motionComponent.animate as Record<string, unknown>) ?? {
            opacity: 1,
          }) as Record<string, string | number | number[]>,
          animate: MOTION_DEFAULTS.motionComponent.animate as Record<
            string,
            string | number | number[]
          >,
          exit: exit as Record<string, string | number | number[]>,
          transition,
        } as MotionPropsFromJson) ?? ({} as MotionPropsFromJson)
      );
    }
    const mc = MOTION_DEFAULTS.motionComponent;
    const exitTransition = {
      type: "tween" as const,
      duration: resolvedExitDuration,
      delay: resolvedExitDelay,
      ease: resolvedExitEasing,
    };
    return (
      mergeMotionDefaults({
        initial: mc.animate as Record<string, string | number | number[]>,
        animate: mc.animate as Record<string, string | number | number[]>,
        exit: (mc.exit as Record<string, string | number | number[]>) ?? { opacity: 0 },
        transition: exitTransition,
      } as MotionPropsFromJson) ?? ({} as MotionPropsFromJson)
    );
  })();

  if (exitTrigger !== "leaveViewport") {
    return (
      <AnimatePresence mode={presenceMode} onExitComplete={onExitComplete}>
        {show && (
          <MotionFromJson key={exitKey} motion={motionConfig} className={className} style={style}>
            {children}
          </MotionFromJson>
        )}
      </AnimatePresence>
    );
  }

  return (
    <LeaveViewportExitPresence
      show={show}
      exitVp={exitVp}
      exitKey={exitKey}
      motionConfig={motionConfig}
      presenceMode={presenceMode}
      onExitComplete={onExitComplete}
      className={className}
      style={style}
    >
      {children}
    </LeaveViewportExitPresence>
  );
}

type LeaveViewportExitPresenceProps = Pick<
  ElementExitWrapperProps,
  "show" | "presenceMode" | "onExitComplete" | "className" | "style" | "children"
> & {
  exitVp: NonNullable<MotionTiming>["exitViewport"] | undefined;
  exitKey: string;
  motionConfig: MotionPropsFromJson;
};

function LeaveViewportExitPresence({
  show,
  exitVp,
  exitKey,
  motionConfig,
  presenceMode,
  onExitComplete,
  className,
  style,
  children,
}: LeaveViewportExitPresenceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(containerRef, {
    once: exitVp?.once ?? false,
    margin: exitVp?.margin,
    amount: exitVp?.amount,
  } as UseInViewOptions);

  const presenceShow = show && isInView;

  return (
    <div ref={containerRef}>
      <AnimatePresence mode={presenceMode} onExitComplete={onExitComplete}>
        {presenceShow && (
          <MotionFromJson key={exitKey} motion={motionConfig} className={className} style={style}>
            {children}
          </MotionFromJson>
        )}
      </AnimatePresence>
    </div>
  );
}
