"use client";

import { forwardRef } from "react";
import { m } from "@/peblor/integrations/framer-motion";
import { mergeMotionDefaults } from "@pb/contracts/peblor/core/peblor-motion-defaults";
import type { MotionPropsFromJson } from "@pb/contracts/types";

/** Motion div props type; we cast JSON-derived props to this for the motion component. */
type MotionDivProps = React.ComponentProps<typeof m.div>;

const MOTION_TAGS = ["div", "span", "section", "article", "main", "header", "footer"] as const;

export type MotionFromJsonProps = {
  /** Motion config from JSON (element, section, or modal). Merged with preset, then passed to motion component. */
  motion: MotionPropsFromJson;
  /** Optional override for animate (e.g. trigger-driven opacity). Merged over the resolved animate from config. */
  animateOverride?: Record<string, unknown>;
  /** When true, use motion as-is (no merge with defaults). Use when config was already merged and must not be re-merged (e.g. overlay with JSON whileTap). */
  useMotionAsIs?: boolean;
  /** HTML element type; default "div". */
  as?: (typeof MOTION_TAGS)[number];
  children: React.ReactNode;
  style?: MotionDivProps["style"];
  transformTemplate?: MotionDivProps["transformTemplate"];
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "style" | "className">;

/**
 * Renders a motion component with props from JSON. All schema keys from the merged config
 * (preset + content) are passed through to the motion component. Only initial/animate/exit
 * are overridden when initialVariant/animateVariant/exitVariant are set.
 */
export const MotionFromJson = forwardRef<HTMLElement, MotionFromJsonProps>(
  (
    {
      motion: motionConfig,
      animateOverride,
      useMotionAsIs,
      as: tag = "div",
      children,
      style,
      transformTemplate,
      className,
      ...rest
    },
    ref
  ) => {
    /** Shared ref-forwarding helper consolidating callback and object ref patterns. */
    const setRef = (el: HTMLElement | null): void => {
      if (typeof ref === "function") (ref as React.RefCallback<HTMLElement>)(el);
      else if (ref && "current" in ref)
        (ref as React.MutableRefObject<HTMLElement | null>).current = el;
    };

    if (!motionConfig || typeof motionConfig !== "object") {
      const Tag = MOTION_TAGS.includes(tag) ? tag : "div";
      return (
        <Tag
          ref={setRef as React.Ref<HTMLDivElement>}
          style={style as React.CSSProperties | undefined}
          className={className}
          {...rest}
        >
          {children}
        </Tag>
      );
    }

    const merged = useMotionAsIs
      ? (motionConfig as Record<string, unknown>)
      : mergeMotionDefaults(motionConfig);
    if (!merged || typeof merged !== "object") {
      const Tag = MOTION_TAGS.includes(tag) ? tag : "div";
      return (
        <Tag
          ref={setRef as React.Ref<HTMLDivElement>}
          style={style as React.CSSProperties | undefined}
          className={className}
          {...rest}
        >
          {children}
        </Tag>
      );
    }

    const {
      initialVariant,
      animateVariant,
      exitVariant,
      // Peblor gesture keys — translate to framer-motion while* props so they
      // don't leak to the DOM as unknown event handlers (onHover, onPress) or
      // collide with React's real onFocus handler.
      onHover,
      onPress,
      onFocus,
      onDrag,
      onVisible,
      ...motionOnly
    } = merged;

    const resolvedAnimate = animateVariant ?? motionOnly.to;
    const animateWithOverride =
      animateOverride && Object.keys(animateOverride).length > 0
        ? {
            ...(typeof resolvedAnimate === "object" && resolvedAnimate != null
              ? resolvedAnimate
              : {}),
            ...animateOverride,
          }
        : resolvedAnimate;

    const motionProps: Record<string, unknown> = {
      ...motionOnly,
      // initial must always be set — even to undefined — so it overrides any
      // user-supplied motionOnly.initial (e.g. false) that would tell Framer
      // Motion to skip the SSR-rendered state and jump straight to animate,
      // causing a hydration mismatch. Peblor controls initial state through
      // initialVariant / motionOnly.from, never through raw motion.initial.
      initial: initialVariant ?? motionOnly.from,
      ...(animateWithOverride !== undefined ? { animate: animateWithOverride } : {}),
      ...(exitVariant !== undefined || motionOnly.leave !== undefined
        ? { exit: exitVariant ?? motionOnly.leave }
        : {}),
      // Translate peblor gesture keys to framer-motion while* props
      whileHover: onHover,
      whileTap: onPress,
      whileFocus: onFocus,
      whileDrag: onDrag,
      whileInView: onVisible,
      style,
      transformTemplate,
      className,
      ref,
      ...rest,
    };

    const MotionComponent = MOTION_TAGS.includes(tag) && m[tag] ? m[tag] : m.div;

    return <MotionComponent {...(motionProps as MotionDivProps)}>{children}</MotionComponent>;
  }
);
MotionFromJson.displayName = "MotionFromJson";
