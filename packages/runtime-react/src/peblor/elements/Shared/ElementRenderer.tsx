"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type {
  ElementBlock,
  MotionPropsFromJson,
  MotionTiming,
  ThemeString,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { resolveElementBlockForBreakpoint } from "@pb/core/layout";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { MotionFromJson } from "@/peblor/integrations/framer-motion/motion-from-json";
import { ElementExitWrapper } from "@/peblor/integrations/framer-motion";
import { resolveFoundationMotionControls } from "@/peblor/integrations/framer-motion/foundation-motion-policy";
import { useElementVisibilityListener } from "@/peblor/hooks/use-element-visibility-listener";
import { useVariableStore } from "@/peblor/runtime/peblor-variable-store";
import {
  evaluateConditions,
  type VisibleWhenConfig,
} from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import type { JsonValue } from "@pb/contracts/types";
import { ELEMENT_COMPONENTS } from "..";
import { ElementEntranceWrapper } from "./ElementEntranceWrapper";
import { DimensionGestureContext } from "./DimensionGestureContext";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeStyleObject, resolveThemeValueDeep } from "@/peblor/theme/theme-string";

/** Keys that, when present in a gesture target, mean the motion wrapper should own the element dimensions. */
const GESTURE_DIMENSION_KEYS = new Set(["width", "height"]);

type BorderGradient = { stroke: ThemeString; width: string | number };
type ResolvedBorderGradient = { stroke: string; width: string | number };

function buildMotionBorderGradientOverlayStyle(
  borderGradient: ResolvedBorderGradient
): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    padding: borderGradient.width,
    borderRadius: "inherit",
    background: borderGradient.stroke,
    boxSizing: "border-box",
    pointerEvents: "none",
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
  };
}

const MOTION_TARGET_KEYS = [
  "initial",
  "animate",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileInView",
  "exit",
] as const;

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

function toSolidBackgroundLayer(color: string): string {
  return `linear-gradient(${color}, ${color})`;
}

function replaceLayeredBackgroundFill(background: string, color: string): string | null {
  const marker = " padding-box, ";
  const splitIndex = background.lastIndexOf(marker);
  if (splitIndex === -1) return null;
  const borderLayer = background.slice(splitIndex + marker.length);
  return `${toSolidBackgroundLayer(color)} padding-box, ${borderLayer}`;
}

function rewriteMotionBackgroundTargets(
  motionConfig: MotionPropsFromJson | undefined,
  wrapperStyle: React.CSSProperties | undefined
): MotionPropsFromJson | undefined {
  if (!motionConfig || typeof motionConfig !== "object") return motionConfig;
  const baseBackground = wrapperStyle?.background;
  if (typeof baseBackground !== "string" || !baseBackground.includes(" padding-box, ")) {
    return motionConfig;
  }

  let didRewrite = false;
  const rewritten: Record<string, unknown> = { ...(motionConfig as Record<string, unknown>) };

  for (const key of MOTION_TARGET_KEYS) {
    const target = rewritten[key];
    if (!target || typeof target !== "object") continue;
    const targetRecord = target as Record<string, unknown>;
    const backgroundColor = targetRecord.backgroundColor;
    if (typeof backgroundColor !== "string" || "background" in targetRecord) continue;
    const layeredBackground = replaceLayeredBackgroundFill(baseBackground, backgroundColor);
    if (!layeredBackground) continue;
    const { backgroundColor: _backgroundColor, ...rest } = targetRecord;
    rewritten[key] = { ...rest, background: layeredBackground };
    didRewrite = true;
  }

  return didRewrite ? (rewritten as MotionPropsFromJson) : motionConfig;
}

/** Build layout style for entrance wrapper from block (align from JSON). Gives full-width containing block and justifies child. */
function buildEntranceWrapperStyle(
  align: "left" | "center" | "right" | undefined,
  fillHeight?: boolean
): React.CSSProperties {
  const justifyContent =
    align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  return {
    width: "100%",
    display: "flex",
    justifyContent,
    ...(fillHeight ? { height: "100%", alignItems: "stretch" } : {}),
  };
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
  const { isMobile } = useDeviceType();
  const themeMode = usePeblorThemeMode();
  const resolvedBlock = useMemo(
    () => resolveElementBlockForBreakpoint(block, isMobile),
    [block, isMobile]
  );
  const blockId = (resolvedBlock as typeof resolvedBlock & { id?: string }).id;
  const visible = useElementVisibilityListener(blockId);
  // visibleWhen — always call hook unconditionally; conditionally use its value below
  const visibleWhen = (resolvedBlock as typeof resolvedBlock & { visibleWhen?: VisibleWhenConfig })
    .visibleWhen;
  // Subscribe only to the variable keys referenced by this element's visibleWhen condition
  // so that unrelated setVariable calls don't re-render every element.
  const conditionKeys = useMemo((): string[] => {
    if (!visibleWhen) return [];
    const keys: string[] = [];
    if (visibleWhen.variable) keys.push(visibleWhen.variable);
    for (const c of visibleWhen.conditions ?? []) keys.push(c.variable);
    return keys;
  }, [visibleWhen]);
  const variables = useVariableStore(
    useShallow(
      (state) =>
        Object.fromEntries(conditionKeys.map((k) => [k, state.variables[k]])) as Record<
          string,
          JsonValue
        >
    )
  );
  const hasEntranceTiming = !!(
    resolvedBlock as typeof resolvedBlock & { motionTiming?: MotionTiming }
  ).motionTiming?.resolvedEntranceMotion;

  const entranceWrapperStyle = useMemo(() => {
    if (!hasEntranceTiming) return undefined;
    const ext = resolvedBlock as typeof resolvedBlock & {
      fixed?: boolean;
      align?: "left" | "center" | "right";
      height?: string | number;
    };
    return ext.fixed ? undefined : buildEntranceWrapperStyle(ext.align, ext.height === "100%");
  }, [hasEntranceTiming, resolvedBlock]);

  const Component = ELEMENT_COMPONENTS[resolvedBlock.type];
  if (!Component) {
    throw new Error(`unknown element type: "${resolvedBlock.type}"`);
  }

  const {
    motionTiming,
    fixed,
    align,
    alignY,
    aria,
    motion: motionFromJson,
    exitPreset,
    wrapperStyle,
    reduceMotion,
    borderGradient: extractedBorderGradient,
    ...blockProps
  } = resolvedBlock as typeof resolvedBlock & {
    motionTiming?: MotionTiming;
    fixed?: boolean;
    align?: "left" | "center" | "right";
    alignY?: "top" | "center" | "bottom";
    aria?: Record<string, string | boolean>;
    motion?: MotionPropsFromJson;
    exitPreset?: string;
    wrapperStyle?: React.CSSProperties;
    reduceMotion?: boolean;
    borderGradient?: BorderGradient;
  };

  const useEntranceWrapper = hasEntranceTiming;
  const resolvedWrapperStyle = useMemo(
    () => resolveThemeStyleObject(wrapperStyle, themeMode) as React.CSSProperties | undefined,
    [wrapperStyle, themeMode]
  );
  const resolvedBorderGradient = useMemo(
    () =>
      resolveThemeValueDeep(extractedBorderGradient, themeMode) as
        | ResolvedBorderGradient
        | undefined,
    [extractedBorderGradient, themeMode]
  );
  const resolvedMotionFromJson = useMemo(
    () => resolveThemeValueDeep(motionFromJson, themeMode) as MotionPropsFromJson | undefined,
    [motionFromJson, themeMode]
  );
  const rewrittenMotionFromJson = useMemo(
    () => rewriteMotionBackgroundTargets(resolvedMotionFromJson, resolvedWrapperStyle),
    [resolvedMotionFromJson, resolvedWrapperStyle]
  );
  const foundationMotionControls = useMemo(
    () => resolveFoundationMotionControls(reduceMotion),
    [reduceMotion]
  );

  // When a gesture target animates width or height, the motion wrapper owns those dimensions.
  // Strip them from the inner component (replace with "100%") so they don't fight the animation.
  const hasDimensionGesture = useMemo(
    () => gestureAnimatesDimensions(resolvedMotionFromJson),
    [resolvedMotionFromJson]
  );
  const {
    width: blockWidth,
    height: blockHeight,
    ...blockPropsWithoutDimensions
  } = blockProps as typeof blockProps & { width?: string | number; height?: string | number };
  const innerBlockProps = hasDimensionGesture
    ? { ...blockPropsWithoutDimensions, width: "100%", height: "100%" }
    : blockProps;

  // When entrance + fixed, render child without fixed so the wrapper's flex handles position; pass align/alignY for child layout and wrapper
  const contentBlockProps =
    hasEntranceTiming && fixed
      ? { ...innerBlockProps, fixed: false, align, alignY }
      : { ...innerBlockProps, align, alignY };

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
        ...(contentBlockProps as typeof resolvedBlock),
        ...(!motionGestureWrapperActive && resolvedWrapperStyle !== undefined
          ? { wrapperStyle: resolvedWrapperStyle }
          : {}),
        ...(!hasBorderGradientWithMotion && resolvedBorderGradient !== undefined
          ? { borderGradient: resolvedBorderGradient }
          : {}),
      } as typeof resolvedBlock)}
    />
  );

  let output: React.ReactNode;
  if (useEntranceWrapper) {
    output = (
      <ElementEntranceWrapper
        motionTiming={motionTiming}
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
      (resolvedWrapperStyle as React.CSSProperties | undefined) ?? {};
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
      ? { ...rewrittenMotionFromJson, layout: true }
      : rewrittenMotionFromJson;
    // The gradient overlay div must live inside the MotionFromJson wrapper so that it
    // inherits borderRadius, follows padding/dimension tweens, and sits on the correct
    // visual layer (same element as backdropFilter/background).
    const borderGradientOverlay = hasBorderGradientWithMotion ? (
      <div aria-hidden style={buildMotionBorderGradientOverlayStyle(resolvedBorderGradient!)} />
    ) : null;
    // When gesture animates dimensions, provide context so all nested elementGroups
    // use width/height:"100%" instead of their Figma-exported fixed px values.
    // This makes the visual layer (e.g. internalframe with bg+radius) fill and grow
    // with the animated container rather than staying at its original size.
    wrapped = hasDimensionGesture ? (
      <DimensionGestureContext.Provider value={true}>
        <MotionFromJson motion={activeMotion} style={motionWrapperStyle}>
          {borderGradientOverlay}
          {wrapped}
        </MotionFromJson>
      </DimensionGestureContext.Provider>
    ) : (
      <MotionFromJson motion={activeMotion} style={motionWrapperStyle}>
        {borderGradientOverlay}
        {wrapped}
      </MotionFromJson>
    );
  }

  const exitMotionRecord = motionTiming?.exitMotion as { exit?: unknown } | undefined;
  const hasExitFromTiming =
    exitMotionRecord?.exit != null && typeof exitMotionRecord.exit === "object";
  const useExitWrapper = Boolean(exitPreset || motionTiming?.exitPreset) || hasExitFromTiming;
  if (useExitWrapper) {
    wrapped = (
      <ElementExitWrapper
        show={exitPresenceShow ?? true}
        exitKey={exitPresenceKey}
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

  if (visibleWhen && !evaluateConditions(visibleWhen, variables)) return null;

  if (!visible) return null;

  return wrapped;
}
