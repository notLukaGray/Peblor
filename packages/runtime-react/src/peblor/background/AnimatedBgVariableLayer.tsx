"use client";

import { useRef, useInsertionEffect, useId, useMemo } from "react";
import type { CSSProperties } from "react";
import { m } from "@/peblor/integrations/framer-motion/animations";
import {
  useBgLayerParallax,
  useBgLayerScrollMotions,
} from "@/peblor/integrations/framer-motion/use-bg-layer-motion";
import { useScrollContainerRef } from "@/peblor/section/position/use-scroll-container";
import type {
  BgParallaxMotion,
  BgScrollMotion,
} from "@/peblor/background/motion/bg-layer-motion-types";
import { composeMotionDivProps } from "./motion/bg-layer-motion-compose";
import type { BgLayerMotion } from "./motion/bg-layer-motion-types";
import { partitionLayerMotions, loopMotionToCss } from "@pb/core/bg-loop-classify";

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
 * CSS-compilable loop animations (opacity, scale, rotate only) are compiled to
 * @keyframes and injected via useInsertionEffect — zero Framer Motion overhead
 * for those layers.
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
  const uid = useId();

  // Partition: CSS-compilable loops vs JS-required motions
  const { cssLoops, jsMotions } = useMemo(
    () =>
      motions && motions.length > 0
        ? partitionLayerMotions(motions)
        : { cssLoops: [], jsMotions: [] },
    [motions]
  );

  // Compile CSS loops to @keyframes — stable uid transform computed once per uid
  const uidClean = useMemo(() => uid.replace(/:/g, ""), [uid]);
  const cssAnimations = useMemo(
    () => cssLoops.map((loop, i) => loopMotionToCss(loop, `${uidClean}-${i}`)),
    [cssLoops, uidClean]
  );
  const cssKeyframesKey = useMemo(
    () => cssAnimations.map((a) => a.keyframes).join(""),
    [cssAnimations]
  );

  useInsertionEffect(() => {
    if (cssAnimations.length === 0) return;
    const styleEl = document.createElement("style");
    styleEl.textContent = cssAnimations.map((a) => a.keyframes).join("\n");
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, [cssKeyframesKey]);

  // CSS animation value combines all compiled loops
  const animationStyle =
    cssAnimations.length > 0
      ? { animation: cssAnimations.map((a) => a.animationValue).join(", ") }
      : {};

  // Base CSS applied to every layer regardless of motion.
  const baseStyle: CSSProperties = {
    background: fill ?? "transparent",
    mixBlendMode: (blendMode ?? DEFAULT_BLEND) as CSSProperties["mixBlendMode"],
    opacity: opacity ?? 1,
    ...(backgroundSize ? { backgroundSize } : {}),
    ...(backgroundPosition ? { backgroundPosition } : {}),
    ...animationStyle,
  };

  // ── Static layer (no motion) ───────────────────────────────────────
  if (!motions?.length) {
    return <div className={LAYER_CLASS} style={baseStyle} />;
  }

  // If no JS motions remain, render a plain div (zero Framer cost)
  if (jsMotions.length === 0) {
    return <div className={LAYER_CLASS} style={baseStyle} />;
  }

  // ── Motion layer ───────────────────────────────────────────────────
  return <MotionLayer layerRef={layerRef} baseStyle={baseStyle} motions={jsMotions} />;
}

// ── Inner motion sub-components ──────────────────────────────────────────────
// Split by motion type so per-type hooks (useScroll, etc.) are only called
// when that motion type is actually configured. Avoids creating unnecessary
// Framer Motion scroll subscriptions for unused motion types.

type MotionLayerProps = {
  layerRef: React.RefObject<HTMLDivElement | null>;
  baseStyle: CSSProperties;
  motions: BgLayerMotion[];
};

/**
 * Renders the layer with parallax MotionValues. Only calls useScroll when
 * parallax is configured, avoiding an unused Framer Motion scroll subscription.
 */
function ParallaxMotionLayer({
  layerRef,
  baseStyle,
  motions,
  parallaxMotion,
}: MotionLayerProps & { parallaxMotion: BgParallaxMotion }) {
  const containerRef = useScrollContainerRef();
  const { parallaxX, parallaxY, axis } = useBgLayerParallax(parallaxMotion, containerRef);
  const motionStyle: Record<string, unknown> = {};
  if (axis === "x") motionStyle.backgroundPositionX = parallaxX;
  else motionStyle.backgroundPositionY = parallaxY;

  // Scroll motions (if any) — handled by a sibling sub-component
  const scrollMotions = useMemo(
    () => motions.filter((m): m is BgScrollMotion => m.type === "scroll"),
    [motions]
  );

  return (
    <ScrollMotionWrapper
      scrollMotions={scrollMotions}
      layerRef={layerRef}
      containerRef={containerRef}
    >
      <MotionLayerInner
        layerRef={layerRef}
        baseStyle={{ ...baseStyle, ...motionStyle }}
        motions={motions}
        useMotionElement={true}
      />
    </ScrollMotionWrapper>
  );
}

/**
 * Always calls useBgLayerScrollMotions (hooks rules require unconditional calls).
 * When scrollMotions is empty the hook is a no-op internally — the useMotionValueEvent
 * callback guards on array length before processing.
 */
function ScrollMotionWrapper({
  scrollMotions,
  layerRef,
  containerRef,
  children,
}: {
  scrollMotions: BgScrollMotion[];
  layerRef: React.RefObject<HTMLElement | null>;
  containerRef: React.RefObject<HTMLElement | null> | null;
  children: React.ReactNode;
}) {
  useBgLayerScrollMotions(scrollMotions, layerRef, containerRef);
  return <>{children}</>;
}

/**
 * Renders the layer with only pointer/trigger/loop/entrance motion (no parallax,
 * no scroll). Zero useScroll calls when these are the only motion types.
 */
function PlainMotionLayer({ layerRef, baseStyle, motions }: MotionLayerProps) {
  const containerRef = useScrollContainerRef();
  const scrollMotions = useMemo(
    () => motions.filter((m): m is BgScrollMotion => m.type === "scroll"),
    [motions]
  );
  const useMotionElement = useMemo(
    () =>
      composeMotionDivProps(motions).needsMotionDiv || motions.some((m) => m.type === "parallax"),
    [motions]
  );

  return (
    <ScrollMotionWrapper
      scrollMotions={scrollMotions}
      layerRef={layerRef}
      containerRef={containerRef}
    >
      <MotionLayerInner
        layerRef={layerRef}
        baseStyle={baseStyle}
        motions={motions}
        useMotionElement={useMotionElement}
      />
    </ScrollMotionWrapper>
  );
}

function MotionLayer({ layerRef, baseStyle, motions }: MotionLayerProps) {
  const parallaxMotion = useMemo(
    () => motions.find((m): m is BgParallaxMotion => m.type === "parallax"),
    [motions]
  );

  if (parallaxMotion) {
    return (
      <ParallaxMotionLayer
        layerRef={layerRef}
        baseStyle={baseStyle}
        motions={motions}
        parallaxMotion={parallaxMotion}
      />
    );
  }

  return <PlainMotionLayer layerRef={layerRef} baseStyle={baseStyle} motions={motions} />;
}

type MotionLayerInnerProps = {
  layerRef: React.RefObject<HTMLDivElement | null>;
  baseStyle: CSSProperties;
  motions: BgLayerMotion[];
  useMotionElement: boolean;
};

function MotionLayerInner({
  layerRef,
  baseStyle,
  motions,
  useMotionElement,
}: MotionLayerInnerProps) {
  // Compose loop + entrance props (no useScroll — scroll/parallax are handled
  // by wrapping sub-components).
  const { initial, animate, whileInView, transition, viewport } = composeMotionDivProps(motions);

  // ── Plain div ─────────────────────────────────────────────────────
  // Pointer / trigger work fine with a plain element — they write directly
  // to the DOM via the ref. We only need m.div for loop, entrance, and parallax.
  if (!useMotionElement) {
    return (
      <div
        ref={layerRef as React.RefObject<HTMLDivElement>}
        className={LAYER_CLASS}
        style={baseStyle}
      />
    );
  }

  // ── m.div — shared props ─────────────────────────────────────
  type MotionDivProps = React.ComponentProps<typeof m.div>;

  const sharedProps = {
    ref: layerRef,
    className: LAYER_CLASS,
    style: baseStyle as MotionDivProps["style"],
    transition:
      Object.keys(transition).length > 0 ? (transition as MotionDivProps["transition"]) : undefined,
  } satisfies Partial<MotionDivProps>;

  // ── onMount entrance or loop only ────────────────────────────────
  if (!whileInView) {
    return (
      <m.div
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
    <m.div
      {...sharedProps}
      initial={Object.keys(initial).length > 0 ? (initial as MotionDivProps["initial"]) : undefined}
      animate={Object.keys(animate).length > 0 ? (animate as MotionDivProps["animate"]) : undefined}
      whileInView={whileInView as MotionDivProps["whileInView"]}
      viewport={viewport as MotionDivProps["viewport"]}
    />
  );
}
