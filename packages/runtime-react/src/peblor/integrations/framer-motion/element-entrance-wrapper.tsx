"use client";

import { useCallback, useRef, useState } from "react";
import { m } from "@/peblor/integrations/framer-motion";
import { useShouldReduceMotion } from "./reduced-motion";
import type { MotionPropsFromJson, MotionTiming } from "@pb/contracts/types";
import { resolveFoundationMotionControls } from "./foundation-motion-policy";

type MotionDivProps = React.ComponentProps<typeof m.div>;

/** Collapse per-property keyframe arrays to the final rest state (reduced-motion / in-view skip). */
function finalTargetFromAnimate(animate: unknown): Record<string, unknown> | undefined {
  if (animate == null || typeof animate !== "object" || Array.isArray(animate)) return undefined;
  const rec = animate as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (Array.isArray(v) && v.length > 0) out[k] = v[v.length - 1];
    else out[k] = v;
  }
  return out;
}

function toOpacity(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value) && value.length > 0) {
    const candidate = value[value.length - 1];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  }
  return fallback;
}

type EntranceResolvedMotion = {
  initial?: unknown;
  animate?: unknown;
  transition?: unknown;
  whileHover?: unknown;
  whileTap?: unknown;
  whileFocus?: unknown;
} & Record<string, unknown>;

function mergeGestureField(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (base && typeof base === "object" && override && typeof override === "object") {
    return {
      ...(base as Record<string, unknown>),
      ...(override as Record<string, unknown>),
    };
  }
  return override;
}

function mergeGestureMotion(
  entrance: EntranceResolvedMotion,
  elementMotion?: MotionPropsFromJson
): EntranceResolvedMotion {
  if (!elementMotion || typeof elementMotion !== "object") return entrance;
  const rec = elementMotion as Record<string, unknown>;
  return {
    ...entrance,
    transition: mergeGestureField(entrance.transition, rec.transition),
    whileHover: mergeGestureField(entrance.whileHover, rec.whileHover),
    whileTap: mergeGestureField(entrance.whileTap, rec.whileTap),
    whileFocus: mergeGestureField(entrance.whileFocus, rec.whileFocus),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function toFadeOnlyResolvedMotion<T extends EntranceResolvedMotion>(resolved: T): T {
  const animateTarget =
    finalTargetFromAnimate(resolved.animate) ??
    (resolved.animate && typeof resolved.animate === "object" && !Array.isArray(resolved.animate)
      ? (resolved.animate as Record<string, unknown>)
      : {});
  const initialTarget =
    resolved.initial && typeof resolved.initial === "object" && !Array.isArray(resolved.initial)
      ? (resolved.initial as Record<string, unknown>)
      : {};
  return {
    ...resolved,
    initial: { opacity: toOpacity(initialTarget.opacity, 0) },
    animate: { opacity: toOpacity(animateTarget.opacity, 1) },
    whileHover: undefined,
    whileTap: undefined,
    whileFocus: undefined,
  } as T;
}

const ALIGN_TO_JUSTIFY: Record<"left" | "center" | "right", string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};
const ALIGN_Y_TO_ALIGN: Record<"top" | "center" | "bottom", string> = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
};

export type ElementEntranceWrapperProps = {
  motionTiming?: MotionTiming;
  elementMotion?: MotionPropsFromJson;
  layoutFixed?: boolean;
  wrapperStyle?: React.CSSProperties;
  align?: "left" | "center" | "right";
  alignY?: "top" | "center" | "bottom";
  aria?: Record<string, string | boolean>;
  /** For trigger "onTrigger": external control of the animate state. */
  animateOverrideFromTrigger?: Record<string, unknown>;
  /** When false, ignore system reduced-motion preference for this element. */
  reduceMotion?: boolean;
  /**
   * Dev / lab: when true, never apply the in-viewport-on-mount shortcut (final state + 0s duration).
   * Otherwise presets like slideUp are invisible in nested previews because the element is always in view.
   */
  forceEntranceAnimation?: boolean;
  children: React.ReactNode;
};

/**
 * Entrance wrapper using Framer Motion's native APIs.
 * Motion config is pre-resolved server-side into motionTiming.resolvedEntranceMotion.
 *
 * SSR renders a plain <div> (no opacity:0 inline style) so the element is visible
 * in the static HTML. After hydration, useLayoutEffect swaps to m.div before
 * the first browser paint — in-viewport elements skip the animation entirely,
 * below-fold elements get their entrance state applied before the user can see them.
 *
 * Triggers:
 *   onMount          → initial → animate on component mount
 *   onFirstVisible   → whileInView once (default)
 *   onEveryVisible   → whileInView every time
 *   onTrigger        → animate controlled by animateOverrideFromTrigger
 */
export function ElementEntranceWrapper({
  motionTiming,
  elementMotion,
  layoutFixed = false,
  wrapperStyle,
  align = "center",
  alignY = "center",
  aria,
  animateOverrideFromTrigger,
  reduceMotion,
  forceEntranceAnimation = false,
  children,
}: ElementEntranceWrapperProps) {
  const motionControls = resolveFoundationMotionControls(reduceMotion);
  const reduceFromPreference = useShouldReduceMotion(motionControls.ignorePreference);
  const skip = motionControls.disableAll || reduceFromPreference;
  const ref = useRef<HTMLDivElement | null>(null);
  // null = pre-hydration (SSR) | false = hydrated, below fold | true = hydrated, in viewport on mount
  const [viewOnMount, setViewOnMount] = useState<boolean | null>(() =>
    forceEntranceAnimation ? false : null
  );

  const setMountRef = useCallback(
    (el: HTMLDivElement | null) => {
      ref.current = el;
      if (!el || viewOnMount !== null) return;
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      setViewOnMount(inView);
    },
    [viewOnMount]
  );

  const resolved = motionTiming?.resolvedEntranceMotion;
  if (!resolved) return <>{children}</>;
  const effectiveResolved = mergeGestureMotion(
    motionControls.replaceWithFade ? toFadeOnlyResolvedMotion(resolved) : resolved,
    elementMotion
  );

  const {
    initial,
    animate,
    transition,
    viewportAmount,
    viewportOnce,
    whileHover,
    whileTap,
    whileFocus,
  } = effectiveResolved;
  const trigger = motionTiming?.trigger ?? "onFirstVisible";
  const bypassInViewShortcut = trigger === "onMount";

  const restAfterEntrance: Record<string, unknown> =
    finalTargetFromAnimate(animate) ??
    (animate && typeof animate === "object" && !Array.isArray(animate)
      ? (animate as Record<string, unknown>)
      : {});
  const shouldShortcutToRest = !bypassInViewShortcut && viewOnMount === true;
  const effectiveInitial = skip || shouldShortcutToRest ? { ...restAfterEntrance } : initial;
  const effectiveTransition = skip || shouldShortcutToRest ? { duration: 0 } : transition;

  // Only clip when scale is genuinely non-unity — "scale": 1 is the default no-op value
  // and should not cause overflow:hidden (which clips descenders and outlines).
  const hasRealScale = (g: Record<string, unknown> | undefined) =>
    g != null && typeof g.scale === "number" && g.scale !== 1;
  const hasScaleGesture =
    hasRealScale(asRecord(whileHover)) ||
    hasRealScale(asRecord(whileTap)) ||
    hasRealScale(asRecord(whileFocus));

  const containerStyle: React.CSSProperties = layoutFixed
    ? {
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: ALIGN_Y_TO_ALIGN[alignY],
        justifyContent: ALIGN_TO_JUSTIFY[align],
        pointerEvents: "none",
      }
    : { ...wrapperStyle, ...(hasScaleGesture ? { overflow: "hidden" } : {}) };

  const innerFlexStyle: React.CSSProperties | undefined = layoutFixed
    ? {
        display: "flex",
        alignItems: ALIGN_Y_TO_ALIGN[alignY],
        justifyContent: ALIGN_TO_JUSTIFY[align],
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
      }
    : undefined;

  const inner =
    layoutFixed && innerFlexStyle ? <div style={innerFlexStyle}>{children}</div> : children;

  // SSR + pre-hydration: plain <div> so the element is visible in the static HTML.
  // LCP is recorded immediately; no opacity:0 in the server-rendered output.
  // After hydration, useLayoutEffect (via setMountRef) determines viewport visibility
  // before the first paint — in-viewport elements skip animation to avoid layout shift.
  // This prevents a flash-of-hidden-content without blocking LCP.
  if (viewOnMount === null) {
    return (
      <m.div ref={setMountRef} style={containerStyle} {...(aria as Record<string, string>)}>
        {inner}
      </m.div>
    );
  }

  const sharedProps = {
    ref: setMountRef,
    style: containerStyle,
    ...(aria as Record<string, unknown>),
  } as Partial<MotionDivProps>;

  if (trigger === "onMount") {
    return (
      <m.div
        {...sharedProps}
        initial={effectiveInitial as MotionDivProps["initial"]}
        animate={animate as MotionDivProps["animate"]}
        transition={effectiveTransition as MotionDivProps["transition"]}
        whileHover={whileHover as MotionDivProps["whileHover"]}
        whileTap={whileTap as MotionDivProps["whileTap"]}
        whileFocus={whileFocus as MotionDivProps["whileFocus"]}
      >
        {inner}
      </m.div>
    );
  }

  if (trigger === "onTrigger") {
    const animateState =
      animateOverrideFromTrigger && Object.keys(animateOverrideFromTrigger).length > 0
        ? animateOverrideFromTrigger
        : effectiveInitial;
    return (
      <m.div
        {...sharedProps}
        initial={effectiveInitial as MotionDivProps["initial"]}
        animate={animateState as MotionDivProps["animate"]}
        transition={effectiveTransition as MotionDivProps["transition"]}
      >
        {inner}
      </m.div>
    );
  }

  // Default: onFirstVisible / onEveryVisible — FM native whileInView
  return (
    <m.div
      {...sharedProps}
      initial={effectiveInitial as MotionDivProps["initial"]}
      whileInView={animate as MotionDivProps["whileInView"]}
      viewport={{
        once: typeof viewportOnce === "boolean" ? viewportOnce : undefined,
        amount:
          viewportAmount === "some" ||
          viewportAmount === "all" ||
          typeof viewportAmount === "number"
            ? viewportAmount
            : undefined,
      }}
      transition={effectiveTransition as MotionDivProps["transition"]}
      whileHover={whileHover as MotionDivProps["whileHover"]}
      whileTap={whileTap as MotionDivProps["whileTap"]}
      whileFocus={whileFocus as MotionDivProps["whileFocus"]}
    >
      {inner}
    </m.div>
  );
}
