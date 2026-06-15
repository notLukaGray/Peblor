"use client";

import { useMemo } from "react";
import type { ElementBlock, MotionPropsFromJson } from "@pb/contracts/peblor/core/peblor-schemas";
import dynamic from "next/dynamic";
import type { MotionFromJsonProps } from "@/peblor/integrations/framer-motion/motion-from-json";
import type { ElementExitWrapperProps } from "@/peblor/integrations/framer-motion/element-exit-wrapper";
import { resolveFoundationMotionControls } from "@/peblor/integrations/framer-motion/foundation-motion-policy";
import { ELEMENT_COMPONENTS } from "..";
import type { ElementEntranceWrapperProps } from "./ElementEntranceWrapper";
import { DimensionGestureContext } from "./DimensionGestureContext";
import { useHoverExitDelay } from "./use-hover-exit-delay";
import { useLiveVariableBindings } from "./use-live-variable-bindings";
import { useResolvedElement } from "./use-resolved-element";
import { useElementVisibility } from "./use-element-visibility";
import { buildBorderGradientOverlayStyle } from "./border-gradient-overlay";

const ElementEntranceWrapper = dynamic(() =>
  import("./ElementEntranceWrapper").then((m) => m.ElementEntranceWrapper)
) as unknown as React.ComponentType<ElementEntranceWrapperProps>;

const MotionFromJson = dynamic(() =>
  import("@/peblor/integrations/framer-motion/motion-from-json").then((m) => m.MotionFromJson)
) as unknown as React.ComponentType<MotionFromJsonProps>;

const ElementExitWrapper = dynamic(() =>
  import("@/peblor/integrations/framer-motion/element-exit-wrapper").then(
    (m) => m.ElementExitWrapper
  )
) as unknown as React.ComponentType<ElementExitWrapperProps>;
/** Keys that, when present in a gesture target, mean the motion wrapper should own the element dimensions. */
const GESTURE_DIMENSION_KEYS = new Set(["width", "height"]);

/**
 * Returns true when any gesture target (whileHover, whileTap, animate) animates width or height.
 * In this case the motion wrapper must own the initial dimensions so the animation has full control,
 * and the inner component should fill 100% rather than using a fixed px size.
 */
function gestureAnimatesDimensions(m: MotionPropsFromJson | undefined): boolean {
  if (!m || typeof m !== "object") return false;
  const rec = m as Record<string, unknown>;
  return (["whileHover", "whileTap", "animate"] as const).some((key) => {
    const target = rec[key];
    return (
      target != null &&
      typeof target === "object" &&
      Object.keys(target as object).some((k) => GESTURE_DIMENSION_KEYS.has(k))
    );
  });
}

type Props = {
  block: ElementBlock;
  /**
   * When the block uses `motionTiming.exitPreset` / top-level `exitPreset`, `ElementExitWrapper`
   * is applied inside this renderer. Dev previews can drive that wrapper’s `show` for AnimatePresence.
   * Omitted / undefined defaults to `true` (production behavior).
   */
  exitPresenceShow?: boolean;
  /** Forwarded to `ElementExitWrapper` when exit presence is active (AnimatePresence child key). */
  exitPresenceKey?: string;
  /** When exit presence is active, forwarded to `AnimatePresence` / exit wrapper. */
  onExitComplete?: () => void;
  /** When exit presence is active, passed to `ElementExitWrapper` (`AnimatePresence` mode). */
  exitPresenceMode?: "sync" | "wait" | "popLayout";
  /**
   * Forwarded to `ElementEntranceWrapper`: play full entrance preset in nested dev previews
   * (slide/scale/etc. are otherwise skipped when the preview is already in the viewport).
   * In production this is always undefined/false — entrance animations that are already
   * in the viewport on mount should skip animation per UX best practice.
   * DEV NOTE: this prop is intended for dev-only use (lab/preview contexts). Setting it
   * to true in production will cause entrance animations to play every time the element
   * mounts, even if it's already in the viewport.
   */
  forceEntranceAnimation?: boolean;
};

export function ElementRenderer({
  block,
  exitPresenceShow,
  exitPresenceKey,
  onExitComplete,
  exitPresenceMode,
  forceEntranceAnimation,
}: Props) {
  const {
    resolvedBlock,
    hasEntranceTiming,
    resolvedWrapperStyle,
    motionSafeWrapperStyle,
    themeOnlyWrapperStyle,
    resolvedBorderGradient,
    resolvedMotionFromJson,
    rewrittenMotionFromJson,
    motionTiming,
    fixed,
    align,
    alignY,
    aria,
    exitPreset,
    reduceMotion,
    blockProps,
    entranceWrapperStyle,
  } = useResolvedElement(block);

  const bindings =
    (resolvedBlock as ElementBlock & { bindings?: Record<string, string> }).bindings ?? null;

  const { variables, boundProps } = useLiveVariableBindings(
    (resolvedBlock as ElementBlock & { visibleWhen?: unknown }).visibleWhen,
    bindings
  );

  const { isVisible } = useElementVisibility(resolvedBlock, variables);

  const Component = ELEMENT_COMPONENTS[resolvedBlock.type];
  if (!Component) {
    throw new Error(`unknown element type: "${resolvedBlock.type}"`);
  }

  const foundationMotionControls = useMemo(
    () => resolveFoundationMotionControls(reduceMotion),
    [reduceMotion]
  );

  const { cleanedMotion, hoverDelayProps } = useHoverExitDelay(rewrittenMotionFromJson);

  // When a gesture target animates width or height, the motion wrapper owns those dimensions.
  // Strip them from the inner component (replace with "100%") so they don't fight the animation.
  const hasDimensionGesture = useMemo(
    () => gestureAnimatesDimensions(resolvedMotionFromJson),
    [resolvedMotionFromJson]
  );
  const { width: blockWidth, height: blockHeight } = blockProps as Record<string, unknown> & {
    width?: string | number;
    height?: string | number;
  };

  // When entrance + fixed, render child without fixed so the wrapper's flex handles position; pass align/alignY for child layout and wrapper.
  const contentBlockProps = useMemo(() => {
    if (hasDimensionGesture) {
      const {
        width: _w,
        height: _h,
        ...rest
      } = blockProps as Record<string, unknown> & {
        width?: string | number;
        height?: string | number;
      };
      const base = { ...rest, width: "100%", height: "100%" };
      return hasEntranceTiming && fixed
        ? { ...base, fixed: false, align, alignY, ...boundProps }
        : { ...base, fixed, align, alignY, ...boundProps };
    }
    return hasEntranceTiming && fixed
      ? { ...blockProps, fixed: false, align, alignY, ...boundProps }
      : { ...blockProps, fixed, align, alignY, ...boundProps };
  }, [hasDimensionGesture, hasEntranceTiming, fixed, align, alignY, boundProps, blockProps]);

  // wrapperStyle is stripped above so MotionFromJson can own it for gesture motion. When that
  // motion wrapper is not used, the element must still receive wrapperStyle (e.g. elementGroup
  // backgrounds / gradients from Figma export).
  // borderGradient is similarly stripped: when a motion wrapper is active, the overlay div must
  // live inside the MotionFromJson wrapper (which owns borderRadius + background) so that it
  // follows rounding, tweens, and is correctly layered. ElementRenderer renders it there instead.
  const motionGestureWrapperActive = Boolean(resolvedMotionFromJson && !hasEntranceTiming);
  const hasBorderGradientWithMotion =
    motionGestureWrapperActive &&
    resolvedBorderGradient != null &&
    typeof resolvedBorderGradient.stroke === "string";

  const content = (
    <Component
      {...({
        ...(contentBlockProps as ElementBlock),
        ...(!motionGestureWrapperActive && resolvedWrapperStyle !== undefined
          ? { wrapperStyle: resolvedWrapperStyle }
          : motionGestureWrapperActive && themeOnlyWrapperStyle !== undefined
            ? { wrapperStyle: themeOnlyWrapperStyle }
            : {}),
        ...(!hasBorderGradientWithMotion && resolvedBorderGradient !== undefined
          ? { borderGradient: resolvedBorderGradient }
          : {}),
      } as ElementBlock)}
    />
  );

  let output: React.ReactNode;
  if (hasEntranceTiming) {
    output = (
      <ElementEntranceWrapper
        motionTiming={motionTiming}
        elementMotion={resolvedMotionFromJson}
        layoutFixed={fixed}
        wrapperStyle={entranceWrapperStyle}
        align={align}
        alignY={alignY}
        aria={aria}
        reduceMotion={reduceMotion}
        forceEntranceAnimation={forceEntranceAnimation}
      >
        {content}
      </ElementEntranceWrapper>
    );
  } else if (aria && Object.keys(aria).length > 0) {
    output = <div {...aria}>{content}</div>;
  } else {
    output = content;
  }

  let wrapped = output;
  if (rewrittenMotionFromJson && !hasEntranceTiming && !foundationMotionControls.disableAll) {
    // For gesture/layout-only motion, fall back to an empty style — not
    // buildEntranceWrapperStyle, which injects width:100% and is designed for
    // entrance wrappers only. An outer group with layout:true must size to its
    // content, not stretch full-width.
    const baseWrapperStyle: React.CSSProperties =
      (motionSafeWrapperStyle as React.CSSProperties | undefined) ?? {};
    // When gesture animates dimensions, the motion wrapper owns width/height as its
    // starting size so Framer Motion can tween them. The inner component fills 100%.
    // layout:true is added automatically so Framer Motion uses FLIP — this keeps the
    // element anchored in place (no positional drift) and lets siblings animate reflow.
    const motionWrapperStyle: React.CSSProperties = {
      ...(hasDimensionGesture
        ? {
            ...baseWrapperStyle,
            ...(blockWidth !== undefined ? { width: blockWidth } : {}),
            ...(blockHeight !== undefined ? { height: blockHeight } : {}),
          }
        : baseWrapperStyle),
      // When the gradient overlay is hosted here, this wrapper must be a positioned
      // container so the overlay's position:absolute/inset:0 resolves against it.
      ...(hasBorderGradientWithMotion ? { position: "relative" } : {}),
    };
    const activeMotion: MotionPropsFromJson = hasDimensionGesture
      ? ({ ...cleanedMotion!, layout: true } as MotionPropsFromJson)
      : cleanedMotion!;
    // The gradient overlay div must live inside the MotionFromJson wrapper so that it
    // inherits borderRadius, follows padding/dimension tweens, and sits on the correct
    // visual layer (same element as backdropFilter/background).
    const borderGradientOverlay = hasBorderGradientWithMotion ? (
      <div aria-hidden style={buildBorderGradientOverlayStyle(resolvedBorderGradient!)} />
    ) : null;
    // When gesture animates dimensions, provide context so all nested elementGroups
    // use width/height:"100%" instead of their Figma-exported fixed px values.
    // This makes the visual layer (e.g. internalframe with bg+radius) fill and grow
    // with the animated container rather than staying at its original size.

    wrapped = hasDimensionGesture ? (
      <DimensionGestureContext.Provider value={true}>
        <MotionFromJson motion={activeMotion} style={motionWrapperStyle} {...hoverDelayProps}>
          {borderGradientOverlay}
          {wrapped}
        </MotionFromJson>
      </DimensionGestureContext.Provider>
    ) : (
      <MotionFromJson motion={activeMotion} style={motionWrapperStyle} {...hoverDelayProps}>
        {borderGradientOverlay}
        {wrapped}
      </MotionFromJson>
    );
  }

  const exitMotionRecord = motionTiming?.exitMotion as { exit?: unknown } | undefined;
  const hasExitFromTiming =
    exitMotionRecord?.exit != null && typeof exitMotionRecord.exit === "object";
  const useExitWrapper = Boolean(exitPreset || motionTiming?.exitPreset) || hasExitFromTiming;
  // Use a stable, unique exitKey derived from the block id to prevent AnimatePresence
  // from confusing sibling exit wrappers. Without a unique key, two exit-wrapped elements
  // with the default "element-exit" key would share AnimatePresence state, causing
  // incorrect enter/exit sequencing. When exitPresenceKey is explicitly provided (e.g.,
  // from dev previews), it takes precedence.
  const effectiveExitKey = exitPresenceKey ?? (block as ElementBlock & { id?: string }).id;
  if (useExitWrapper) {
    wrapped = (
      <ElementExitWrapper
        show={exitPresenceShow ?? true}
        exitKey={effectiveExitKey}
        exitPreset={exitPreset ?? motionTiming?.exitPreset}
        motionTiming={motionTiming}
        motion={resolvedMotionFromJson}
        reduceMotion={reduceMotion}
        onExitComplete={onExitComplete}
        presenceMode={exitPresenceMode}
      >
        {wrapped}
      </ElementExitWrapper>
    );
  }

  if (!isVisible) return null;

  return wrapped;
}
