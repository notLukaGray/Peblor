"use client";

import { forwardRef, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { MotionFromJson } from "./motion-from-json";
import { motion } from "./animations";
import { useShouldReduceMotion } from "./reduced-motion";
import { resolveFoundationMotionControls } from "./foundation-motion-policy";
import type { MotionPropsFromJson, MotionTiming } from "@pb/contracts/peblor/core/peblor-schemas";

type SectionElementProps = React.ComponentPropsWithoutRef<"section"> & {
  ref?: RefObject<HTMLElement>;
};

type MotionSectionProps = React.ComponentProps<typeof motion.section>;

export type SectionMotionWrapperProps = {
  sectionRef: RefObject<HTMLElement | null>;
  motion?: MotionPropsFromJson;
  /** Entrance/exit semantics resolved server-side (same pipeline as elements). */
  motionTiming?: MotionTiming;
  /** When true (default), respect the user's OS reduced-motion preference. Set false to always animate. */
  reduceMotion?: boolean;
  children: React.ReactNode;
} & Omit<SectionElementProps, "ref">;

function toOpacity(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value) && value.length > 0) {
    const candidate = value[value.length - 1];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  }
  return fallback;
}

type SectionResolvedMotion = {
  initial?: unknown;
  animate?: unknown;
  whileHover?: unknown;
  whileTap?: unknown;
} & Record<string, unknown>;

function toFadeOnlySectionMotion<T extends SectionResolvedMotion>(resolved: T): T {
  const animate =
    resolved.animate && typeof resolved.animate === "object" && !Array.isArray(resolved.animate)
      ? (resolved.animate as Record<string, unknown>)
      : {};
  const initial =
    resolved.initial && typeof resolved.initial === "object" && !Array.isArray(resolved.initial)
      ? (resolved.initial as Record<string, unknown>)
      : {};
  return {
    ...resolved,
    initial: { opacity: toOpacity(initial.opacity, 0) },
    animate: { opacity: toOpacity(animate.opacity, 1) },
    whileHover: undefined,
    whileTap: undefined,
  } as T;
}

/**
 * Wraps a section element with optional MotionFromJson (raw FM props via `motion`) or
 * entrance animation (via `motionTiming`, resolved server-side — same pipeline as elements).
 *
 * When motionTiming is present it takes precedence over `motion` for entrance behaviour.
 * SSR renders a plain <section> so the element is visible in static HTML; useLayoutEffect
 * swaps to motion.section before the first browser paint, exactly as ElementEntranceWrapper does.
 *
 * sectionRef is always forwarded to the DOM node so viewport triggers and scroll-driven
 * features continue to work regardless of which rendering path is taken.
 */
export const SectionMotionWrapper = forwardRef<HTMLElement, SectionMotionWrapperProps>(
  (
    { sectionRef, motion: motionFromJson, motionTiming, reduceMotion, children, ...sectionProps },
    _forwardedRef
  ) => {
    const { ref: _omitRef, ...restSectionProps } = sectionProps as SectionElementProps & {
      ref?: RefObject<HTMLElement>;
    };

    const motionControls = resolveFoundationMotionControls(reduceMotion);

    // ── motionTiming path (entrance animation, same semantics as ElementEntranceWrapper) ──
    const resolved = motionTiming?.resolvedEntranceMotion;
    const reduceFromPreference = useShouldReduceMotion(motionControls.ignorePreference);
    const skip = motionControls.disableAll || reduceFromPreference;
    // null = pre-hydration (SSR) | false = hydrated, below fold | true = hydrated, in viewport
    const [viewOnMount, setViewOnMount] = useState<boolean | null>(null);

    // Fix 2: window.innerHeight is already inside useLayoutEffect (client-only), so SSR is safe.
    // The existing guard is correct; adding an explicit typeof check for clarity.
    useLayoutEffect(() => {
      if (!resolved) return;
      const el = sectionRef.current;
      const inView =
        !!el &&
        typeof window !== "undefined" &&
        el.getBoundingClientRect().top < window.innerHeight &&
        el.getBoundingClientRect().bottom > 0;
      queueMicrotask(() => {
        setViewOnMount(inView);
      });
    }, [resolved, sectionRef]);

    const onTriggerUnsupportedWarnedRef = useRef(false);
    useLayoutEffect(() => {
      if (process.env.NODE_ENV !== "development" || !resolved || !motionTiming) return;
      const trigger = motionTiming.trigger ?? "onFirstVisible";
      if (trigger !== "onTrigger" || onTriggerUnsupportedWarnedRef.current) return;
      onTriggerUnsupportedWarnedRef.current = true;
      console.warn(
        '[peblor] SectionMotionWrapper: triggerMode "onTrigger" is not supported for sections — falling back to "whileInView".'
      );
    }, [resolved, motionTiming]);

    if (resolved) {
      const effectiveResolved = motionControls.replaceWithFade
        ? toFadeOnlySectionMotion(resolved)
        : resolved;
      const { initial, animate, transition, viewportAmount, viewportOnce, whileHover, whileTap } =
        effectiveResolved;
      const trigger = motionTiming?.trigger ?? "onFirstVisible";

      const effectiveInitial = skip || viewOnMount === true ? animate : initial;
      const effectiveTransition = skip || viewOnMount === true ? { duration: 0 } : transition;

      const sharedProps = {
        ...restSectionProps,
        ref: sectionRef as RefObject<HTMLElement>,
      } as Partial<MotionSectionProps>;

      // SSR + pre-hydration: plain section so content is visible in static HTML.
      if (viewOnMount === null) {
        return (
          <section ref={sectionRef} {...restSectionProps}>
            {children}
          </section>
        );
      }

      if (trigger === "onMount") {
        return (
          <motion.section
            {...sharedProps}
            initial={effectiveInitial as MotionSectionProps["initial"]}
            animate={animate as MotionSectionProps["animate"]}
            transition={effectiveTransition as MotionSectionProps["transition"]}
            whileHover={whileHover as MotionSectionProps["whileHover"]}
            whileTap={whileTap as MotionSectionProps["whileTap"]}
          >
            {children}
          </motion.section>
        );
      }

      // Default: onFirstVisible / onEveryVisible — FM native whileInView
      // onTrigger is not applicable to sections (warn once in dev via useLayoutEffect); falls through to whileInView.

      return (
        <motion.section
          {...sharedProps}
          initial={effectiveInitial as MotionSectionProps["initial"]}
          whileInView={animate as MotionSectionProps["whileInView"]}
          viewport={{ once: viewportOnce, amount: viewportAmount }}
          transition={effectiveTransition as MotionSectionProps["transition"]}
          whileHover={whileHover as MotionSectionProps["whileHover"]}
          whileTap={whileTap as MotionSectionProps["whileTap"]}
        >
          {children}
        </motion.section>
      );
    }

    // ── Raw motion props path (existing behaviour) ──
    if (motionFromJson) {
      return (
        <MotionFromJson
          as="section"
          motion={motionFromJson}
          ref={sectionRef as RefObject<HTMLElement>}
          {...restSectionProps}
        >
          {children}
        </MotionFromJson>
      );
    }

    return (
      <section ref={sectionRef} {...restSectionProps}>
        {children}
      </section>
    );
  }
);
SectionMotionWrapper.displayName = "SectionMotionWrapper";
