"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { MotionFromJson } from "./motion-from-json";
import { m } from "./animations";
import { useShouldReduceMotion } from "./reduced-motion";
import { resolveFoundationMotionControls } from "./foundation-motion-policy";
import type { MotionPropsFromJson, MotionTiming } from "@pb/contracts/peblor/core/peblor-schemas";
import type { MotionValue } from "./types";

type SectionElementProps = React.ComponentPropsWithoutRef<"section"> & {
  ref?: RefObject<HTMLElement>;
};

type MotionSectionProps = React.ComponentProps<typeof m.section>;

export type SectionMotionWrapperProps = {
  sectionRef: RefObject<HTMLElement | null>;
  motion?: MotionPropsFromJson;
  /** Entrance/exit semantics resolved server-side (same pipeline as elements). */
  motionTiming?: MotionTiming;
  /** When true (default), respect the user's OS reduced-motion preference. Set false to always animate. */
  reduceMotion?: boolean;
  /** Direct section parallax binding that bypasses React renders on scroll. */
  parallaxY?: MotionValue<number>;
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
  from?: unknown;
  to?: unknown;
  onHover?: unknown;
  onPress?: unknown;
} & Record<string, unknown>;

function toFadeOnlySectionMotion<T extends SectionResolvedMotion>(resolved: T): T {
  const to =
    resolved.to && typeof resolved.to === "object" && !Array.isArray(resolved.to)
      ? (resolved.to as Record<string, unknown>)
      : {};
  const from =
    resolved.from && typeof resolved.from === "object" && !Array.isArray(resolved.from)
      ? (resolved.from as Record<string, unknown>)
      : {};
  return {
    ...resolved,
    from: { opacity: toOpacity(from.opacity, 0) },
    to: { opacity: toOpacity(to.opacity, 1) },
    onHover: undefined,
    onPress: undefined,
  } as T;
}

export function buildMotionSectionStyle(
  style: SectionElementProps["style"],
  parallaxY?: MotionValue<number>
): Pick<MotionSectionProps, "style" | "transformTemplate"> {
  if (!parallaxY) {
    return { style };
  }

  if (!style || typeof style !== "object") {
    return {
      style: { y: parallaxY } as MotionSectionProps["style"],
    };
  }

  const { transform, ...restStyle } = style;
  const motionStyle = {
    ...(restStyle as React.CSSProperties),
    y: parallaxY,
  } as MotionSectionProps["style"];

  if (typeof transform !== "string" || transform.trim().length === 0) {
    return { style: motionStyle };
  }

  return {
    style: motionStyle,
    transformTemplate: (_latest, generatedTransform) =>
      [transform, generatedTransform]
        .filter((value): value is string => !!value && value.trim().length > 0)
        .join(" "),
  };
}

/**
 * Wraps a section element with optional MotionFromJson (raw FM props via `motion`) or
 * entrance animation (via `motionTiming`, resolved server-side — same pipeline as elements).
 *
 * When motionTiming is present it takes precedence over `motion` for entrance behaviour.
 * SSR renders a plain <section> so the element is visible in static HTML; useLayoutEffect
 * swaps to m.section before the first browser paint, exactly as ElementEntranceWrapper does.
 *
 * sectionRef is always forwarded to the DOM node so viewport triggers and scroll-driven
 * features continue to work regardless of which rendering path is taken.
 */
export const SectionMotionWrapper = forwardRef<HTMLElement, SectionMotionWrapperProps>(
  (
    {
      sectionRef,
      motion: motionFromJson,
      motionTiming,
      reduceMotion,
      parallaxY,
      children,
      ...sectionProps
    },
    _forwardedRef
  ) => {
    const { ref: _omitRef, ...restSectionProps } = sectionProps as SectionElementProps & {
      ref?: RefObject<HTMLElement>;
    };
    const motionStyleProps = buildMotionSectionStyle(restSectionProps.style, parallaxY);
    const sharedMotionSectionProps = {
      ...restSectionProps,
      ...motionStyleProps,
    } as MotionSectionProps;

    const motionControls = resolveFoundationMotionControls(reduceMotion);

    // ── motionTiming path (entrance animation, same semantics as ElementEntranceWrapper) ──
    const resolved = motionTiming?.resolvedEntranceMotion;
    const reduceFromPreference = useShouldReduceMotion(motionControls.ignorePreference);
    const skip = motionControls.disableAll || reduceFromPreference;
    // null = pre-hydration (SSR) | false = hydrated, below fold | true = hydrated, in viewport
    const [viewOnMount, setViewOnMount] = useState<boolean | null>(null);

    // Ref callback fires synchronously during the commit phase — React processes the
    // setState before yielding to the browser, so the swap from <section> to
    // <m.section> happens before the first paint. Same pattern as
    // ElementEntranceWrapper (element-entrance-wrapper.tsx).
    const setMountRef = useCallback(
      (el: HTMLElement | null) => {
        (sectionRef as React.MutableRefObject<HTMLElement | null>).current = el;
        if (!el || viewOnMount !== null || !resolved) return;
        const rect = el.getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 0;
        setViewOnMount(inView);
      },
      [viewOnMount, resolved, sectionRef]
    );

    // Sections don't support "onTrigger" trigger mode — there's no per-section
    // animateOverrideFromTrigger prop (it's only available on per-element entrance
    // wrappers). If onTrigger is set on a section, fall back to whileInView and
    // warn in development. The entrance API would need a section-level trigger
    // mechanism to support this (e.g., via a sectionRef-based imperative animate).
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
      const { from, to, transition, viewportAmount, viewportOnce, onHover, onPress } =
        effectiveResolved;
      const trigger = motionTiming?.trigger ?? "onFirstVisible";

      const effectiveInitial = skip || viewOnMount === true ? to : from;
      const effectiveTransition = skip || viewOnMount === true ? { duration: 0 } : transition;

      // SSR + pre-hydration: plain <section> so content is visible in static HTML.
      // No opacity:0 in SSR output — LCP is recorded immediately. Same pattern as
      // ElementEntranceWrapper (R-09). setMountRef callback determines viewport
      // visibility during the commit phase and swaps to m.section before paint.
      if (viewOnMount === null) {
        return (
          <section ref={setMountRef} {...restSectionProps}>
            {children}
          </section>
        );
      }

      if (trigger === "onMount") {
        return (
          <m.section
            {...sharedMotionSectionProps}
            ref={setMountRef}
            initial={effectiveInitial as MotionSectionProps["initial"]}
            animate={to as MotionSectionProps["animate"]}
            transition={effectiveTransition as MotionSectionProps["transition"]}
            whileHover={onHover as MotionSectionProps["whileHover"]}
            whileTap={onPress as MotionSectionProps["whileTap"]}
          >
            {children}
          </m.section>
        );
      }

      // Default: onFirstVisible / onEveryVisible — FM native whileInView
      // onTrigger is not applicable to sections (warn once in dev via useLayoutEffect); falls through to whileInView.

      return (
        <m.section
          {...sharedMotionSectionProps}
          ref={setMountRef}
          initial={effectiveInitial as MotionSectionProps["initial"]}
          whileInView={to as MotionSectionProps["whileInView"]}
          viewport={{ once: viewportOnce, amount: viewportAmount }}
          transition={effectiveTransition as MotionSectionProps["transition"]}
          whileHover={onHover as MotionSectionProps["whileHover"]}
          whileTap={onPress as MotionSectionProps["whileTap"]}
        >
          {children}
        </m.section>
      );
    }

    // ── Raw motion props path (existing behaviour) ──
    if (motionFromJson) {
      return (
        <MotionFromJson
          as="section"
          motion={motionFromJson}
          ref={setMountRef}
          {...restSectionProps}
          {...motionStyleProps}
        >
          {children}
        </MotionFromJson>
      );
    }

    if (parallaxY) {
      return (
        <m.section {...sharedMotionSectionProps} ref={setMountRef}>
          {children}
        </m.section>
      );
    }

    return (
      <section ref={setMountRef} {...restSectionProps}>
        {children}
      </section>
    );
  }
);
SectionMotionWrapper.displayName = "SectionMotionWrapper";
