"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import { motion } from "@/peblor/integrations/framer-motion/animations";
import { useBgLayerMotion } from "@/peblor/integrations/framer-motion/use-bg-layer-motion";
import { composeMotionDivProps } from "./motion/bg-layer-motion-compose";
import type { BgLayerMotion } from "./motion/bg-layer-motion-types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnimatedBgVariableLayerProps = {
  fill?: string;
  blendMode?: string;
  opacity?: number;
  /** Passed directly as `background-size` on the layer div. */
  backgroundSize?: string;
  /** Passed directly as `background-position` on the layer div. Overridden by parallax. */
  backgroundPosition?: string;
  /** Motion array — multiple types compose additively on the same layer. */
  motion?: BgLayerMotion[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const LAYER_CLASS = "absolute inset-0";
const DEFAULT_BLEND = "normal";

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * A single background variable layer, capable of composing up to six simultaneous
 * motion types on the same DOM element:
 *
 *  • loop    — continuous FM animate (gradient pan, pulse, hue-rotate…)
 *  • entrance — one-shot fade/scale in via FM initial / animate / whileInView
 *  • scroll  — CSS property interpolation from page-scroll progress
 *  • pointer — CSS property lerp from mouse position (RAF-based)
 *  • parallax — backgroundPosition MotionValue driven by scroll
 *  • trigger — imperative FM animate() on custom window events
 *
 * When no `motion` array is provided the layer renders as a plain `<div>` —
 * identical in output to the original BackgroundVariable layer.
 */
export function AnimatedBgVariableLayer({
  fill,
  blendMode,
  opacity,
  backgroundSize,
  backgroundPosition,
  motion: motions,
}: AnimatedBgVariableLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);

  // Base CSS applied to every layer regardless of motion.
  const baseStyle: CSSProperties = {
    background: fill ?? "transparent",
    mixBlendMode: (blendMode ?? DEFAULT_BLEND) as CSSProperties["mixBlendMode"],
    opacity: opacity ?? 1,
    ...(backgroundSize ? { backgroundSize } : {}),
    ...(backgroundPosition ? { backgroundPosition } : {}),
  };

  // ── Static layer (no motion) ───────────────────────────────────────
  if (!motions?.length) {
    return <div className={LAYER_CLASS} style={baseStyle} />;
  }

  // ── Motion layer ───────────────────────────────────────────────────
  return <MotionLayer layerRef={layerRef} baseStyle={baseStyle} motions={motions} />;
}

// ── Inner motion component ────────────────────────────────────────────────────
// Split into a separate component so hooks are only called when motions exist.

type MotionLayerProps = {
  layerRef: React.RefObject<HTMLDivElement | null>;
  baseStyle: CSSProperties;
  motions: BgLayerMotion[];
};

function MotionLayer({ layerRef, baseStyle, motions }: MotionLayerProps) {
  // ── Scroll / pointer / parallax / trigger hooks ───────────────────
  // These write directly to the DOM (scroll, pointer, trigger) or return
  // MotionValues for parallax — no React re-renders involved.
  const { motionStyle } = useBgLayerMotion(motions, layerRef);

  // ── Loop + entrance composition ────────────────────────────────────
  // Merge all loop and entrance configs into a single set of FM motion.div props.
  const { initial, animate, whileInView, transition, viewport, needsMotionDiv } =
    composeMotionDivProps(motions);

  // Whether this layer needs a motion.div at all.
  // Parallax always needs one (MotionValue in style prop requires motion.*).
  const hasParallax = motions.some((m) => m.type === "parallax");
  const useMotionElement = needsMotionDiv || hasParallax;

  // Merge base style with parallax MotionValues.
  // motionStyle is empty {} when no parallax is active.
  const composedStyle = { ...baseStyle, ...motionStyle };

  // ── Plain div ─────────────────────────────────────────────────────
  // Scroll / pointer / trigger work fine with a plain element — they write directly
  // to the DOM via the ref. We only need motion.div for loop, entrance, and parallax.
  if (!useMotionElement) {
    return (
      <div
        ref={layerRef as React.RefObject<HTMLDivElement>}
        className={LAYER_CLASS}
        style={baseStyle}
      />
    );
  }

  // ── motion.div — shared props ─────────────────────────────────────
  type MotionDivProps = React.ComponentProps<typeof motion.div>;

  const sharedProps = {
    ref: layerRef,
    className: LAYER_CLASS,
    style: composedStyle as MotionDivProps["style"],
    transition:
      Object.keys(transition).length > 0 ? (transition as MotionDivProps["transition"]) : undefined,
  } satisfies Partial<MotionDivProps>;

  // ── onMount entrance or loop only ────────────────────────────────
  if (!whileInView) {
    return (
      <motion.div
        {...sharedProps}
        initial={
          Object.keys(initial).length > 0 ? (initial as MotionDivProps["initial"]) : undefined
        }
        animate={
          Object.keys(animate).length > 0 ? (animate as MotionDivProps["animate"]) : undefined
        }
      />
    );
  }

  // ── onFirstVisible / onEveryVisible entrance (+ optional loop) ───
  // Loop props stay in `animate` (run continuously).
  // Entrance props live in `whileInView` (fire on viewport enter).
  return (
    <motion.div
      {...sharedProps}
      initial={Object.keys(initial).length > 0 ? (initial as MotionDivProps["initial"]) : undefined}
      animate={Object.keys(animate).length > 0 ? (animate as MotionDivProps["animate"]) : undefined}
      whileInView={whileInView as MotionDivProps["whileInView"]}
      viewport={viewport as MotionDivProps["viewport"]}
    />
  );
}
