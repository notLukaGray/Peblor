"use client";

import { forwardRef } from "react";
import { motion } from "@/peblor/integrations/framer-motion";
import { mergeMotionDefaults } from "@pb/contracts/peblor/core/peblor-motion-defaults";
import type { MotionPropsFromJson } from "@pb/contracts/types";

/** Motion div props type; we cast JSON-derived props to this for the motion component. */
type MotionDivProps = React.ComponentProps<typeof motion.div>;

const MOTION_TAGS = ["div", "span", "section", "article", "main", "header", "footer"] as const;

type MotionFromJsonProps = {
  /** Motion config from JSON (element, section, or modal). Merged with preset, then passed to motion component. */
  motion: MotionPropsFromJson;
  /** Optional override for animate (e.g. trigger-driven opacity). Merged over the resolved animate from config. */
  animateOverride?: Record<string, unknown>;
  /** When true, use motion as-is (no merge with defaults). Use when config was already merged and must not be re-merged (e.g. overlay with JSON whileTap). */
  useMotionAsIs?: boolean;
  /** HTML element type; default "div". */
  as?: (typeof MOTION_TAGS)[number];
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<"div">, "children">;

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
      className,
      ...rest
    },
    ref
  ) => {
    if (!motionConfig || typeof motionConfig !== "object") {
      const Tag = MOTION_TAGS.includes(tag) ? tag : "div";
      const setRef = (el: HTMLElement | null): void => {
        if (typeof ref === "function") (ref as React.RefCallback<HTMLElement>)(el);
        else if (ref && "current" in ref)
          (ref as React.MutableRefObject<HTMLElement | null>).current = el;
      };
      return (
        <Tag
          ref={setRef as React.Ref<HTMLDivElement>}
          style={style}
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
      const setRef = (el: HTMLElement | null): void => {
        if (typeof ref === "function") (ref as React.RefCallback<HTMLElement>)(el);
        else if (ref && "current" in ref)
          (ref as React.MutableRefObject<HTMLElement | null>).current = el;
      };
      return (
        <Tag
          ref={setRef as React.Ref<HTMLDivElement>}
          style={style}
          className={className}
          {...rest}
        >
          {children}
        </Tag>
      );
    }

    const { initialVariant, animateVariant, exitVariant, ...motionOnly } = merged;

    const resolvedAnimate = animateVariant ?? motionOnly.animate;
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
      initial: initialVariant ?? motionOnly.initial,
      animate: animateWithOverride,
      exit: exitVariant ?? motionOnly.exit,
      style,
      className,
      ref,
      ...rest,
    };

    const MotionComponent = MOTION_TAGS.includes(tag) && motion[tag] ? motion[tag] : motion.div;

    return <MotionComponent {...(motionProps as MotionDivProps)}>{children}</MotionComponent>;
  }
);
MotionFromJson.displayName = "MotionFromJson";
