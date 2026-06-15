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
  /**
   * Full motion config from JSON (initial, animate, exit, transition).
   * Used as a runtime fallback when `motionTiming.resolvedExitMotion` is not
   * pre-populated by the server pipeline (e.g. in dev tooling / studio).
   */
  motion?: MotionPropsFromJson;
  /** Exit trigger, viewport, presets, and pre-resolved motion. When the server
   * pipeline runs, `resolvedExitMotion` takes priority. When it doesn't,
   * `exitMotion` and `exitPreset` inside this object serve as runtime fallbacks. */
  motionTiming?: MotionTiming;
  /**
   * Exit preset name (from framer-motion-presets exitPresets).
   * Runtime fallback when `motionTiming.resolvedExitMotion` is not set and
   * `motionTiming.exitPreset` is not provided.
   */
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
 * Resolution priority:
 * 1. replaceWithFade — reduced-motion override, hardcoded fade
 * 2. `motionTiming.resolvedExitMotion` — pre-resolved by the server pipeline (production fast-path)
 * 3. Runtime fallback — `motionTiming.exitMotion` / `motion` / `exitPreset` resolved at runtime
 *    (used in dev tooling / studio where the pipeline hasn't run)
 * 4. Generic defaults from MOTION_DEFAULTS.motionComponent
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

  const motionConfig: MotionPropsFromJson = (() => {
    // Priority 1: replaceWithFade — hardcoded fade exit (reduced-motion override).
    if (motionControls.replaceWithFade) {
      return (
        mergeMotionDefaults({
          from: MOTION_DEFAULTS.motionComponent.to as Record<string, unknown>,
          to: MOTION_DEFAULTS.motionComponent.to as Record<string, unknown>,
          leave: { opacity: 0 },
          transition: {
            type: "ease" as const,
            duration: exitDuration,
            delay: 0,
            ease: exitEasing,
          },
        } as MotionPropsFromJson) ?? ({} as MotionPropsFromJson)
      );
    }

    // Priority 2: pre-resolved exit motion from server pipeline.
    // Covers both exitMotion.leave and exitPreset resolution — no runtime lookup needed.
    if (motionTiming?.resolvedExitMotion) {
      const { leave, transition } = motionTiming.resolvedExitMotion;
      return (
        mergeMotionDefaults({
          from: MOTION_DEFAULTS.motionComponent.to as Record<string, unknown>,
          to: MOTION_DEFAULTS.motionComponent.to as Record<string, unknown>,
          leave: leave as Record<string, unknown>,
          transition: transition ?? {
            type: "ease" as const,
            duration: exitDuration,
            delay: 0,
            ease: exitEasing,
          },
        } as MotionPropsFromJson) ?? ({} as MotionPropsFromJson)
      );
    }

    // Priority 3: runtime fallback — resolve exitMotion / exitPreset at runtime.
    // This path handles dev tooling (studio) where the pipeline hasn't run,
    // and any edge case where resolvedExitMotion wasn't populated.
    const effectiveExitMotion = motionTiming?.exitMotion ?? motionFromJson;
    const effectiveExitPreset = motionTiming?.exitPreset ?? exitPreset;

    // 3a: explicit exitMotion with a leave key — use the full motion object directly
    if (
      effectiveExitMotion != null &&
      typeof effectiveExitMotion === "object" &&
      (effectiveExitMotion as MotionPropsFromJson)?.leave != null
    ) {
      return (
        mergeMotionDefaults(effectiveExitMotion as MotionPropsFromJson) ??
        ({} as MotionPropsFromJson)
      );
    }

    // 3b: exitPreset name — resolve via getExitMotionFromPreset.
    // When exitMotion coexists (with a transition but no leave key), extract its
    // duration/delay/ease overrides so authored values are not silently dropped.
    if (typeof effectiveExitPreset === "string" && effectiveExitPreset.length > 0) {
      const motionTransition =
        effectiveExitMotion != null && typeof effectiveExitMotion === "object"
          ? ((effectiveExitMotion as Record<string, unknown>).transition as
              | {
                  duration?: number;
                  delay?: number;
                  ease?: string | [number, number, number, number];
                }
              | undefined)
          : undefined;
      const { leave, transition } = getExitMotionFromPreset(effectiveExitPreset, {
        duration: motionTransition?.duration ?? exitDuration,
        delay: motionTransition?.delay ?? 0,
        ease: motionTransition?.ease ?? exitEasing,
      });
      return (
        mergeMotionDefaults({
          from: MOTION_DEFAULTS.motionComponent.to as Record<string, unknown>,
          to: MOTION_DEFAULTS.motionComponent.to as Record<string, unknown>,
          leave: leave as Record<string, unknown>,
          transition,
        } as MotionPropsFromJson) ?? ({} as MotionPropsFromJson)
      );
    }

    // Priority 4: generic defaults (no exit config provided at all).
    const mc = MOTION_DEFAULTS.motionComponent;
    return (
      mergeMotionDefaults({
        from: mc.to as Record<string, string | number | number[]>,
        to: mc.to as Record<string, string | number | number[]>,
        leave: (mc.leave as Record<string, string | number | number[]>) ?? { opacity: 0 },
        transition: {
          type: "ease" as const,
          duration: exitDuration,
          delay: 0,
          ease: exitEasing,
        },
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
