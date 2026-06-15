"use client";

import { Children, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import type { ResponsiveValueOf } from "@pb/contracts/peblor/core/peblor-schemas/responsive-value-schemas";
import { getPbContentGuidelines } from "@pb/core/host";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import {
  coalesceEmptyString,
  getElementLayoutStyle,
  normalizeFlexAlignItemsValue,
  normalizeFlexJustifyContentValue,
  peblorJustifyContentForGap,
  peblorOverlapGapToCss,
  resolveFrameColumnGapCss,
  resolveFrameGapCss,
  resolveFrameRowGapCss,
  sectionEffectsToStyle,
} from "@pb/core/layout";
import {
  scaleRadiusForDensity,
  scaleSpaceShorthandForDensity,
} from "@pb/contracts/peblor/core/page-density";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import type { PeblorAction } from "@pb/contracts/types";
import { firePeblorAction } from "@/peblor/triggers";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import {
  buildBorderGradientOverlayStyle,
  type BorderGradient,
} from "@/peblor/elements/ElementModule/element-module-style-utils";
import { lowerThemeStyleObject, lowerThemeValueDeep } from "@/peblor/theme/theme-string";
import {
  useElementEffects,
  hasElementInteractions,
} from "@/peblor/elements/Shared/use-element-effects";
import { m } from "@/peblor/integrations/framer-motion";
import type { Easing } from "@/peblor/integrations/framer-motion";
import { globals } from "@pb/runtime-react/core/lib/globals";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";

const MOTION_WRAPPER_STYLE: CSSProperties = { display: "block" };

type GroupBase = Extract<ElementBlock, { type: "elementGroup" }>;

// Re-declare layout fields explicitly because Omit<GroupBase, "section"> + index signature
// widens all fields to `unknown`. TypeScript cannot narrow union-typed index signatures
// through Omit, so we list every layout prop with its original type to keep strict typing
// on the component props. This is a known TypeScript limitation (microsoft/TypeScript#42477).
// Unlike ElementModuleGroup which co-locates its layout types inline, MixedElementGroupIsland
// needs the explicit type because its props are forwarded as an interface to ClientMixedElementGroupShell.
type LayoutOverrides = {
  width?: ResponsiveValueOf<string>;
  height?: ResponsiveValueOf<string>;
  minWidth?: ResponsiveValueOf<string>;
  minHeight?: ResponsiveValueOf<string>;
  maxWidth?: ResponsiveValueOf<string>;
  maxHeight?: ResponsiveValueOf<string>;
  borderRadius?: ResponsiveValueOf<string>;
  selfAlign?: ResponsiveValueOf<"center" | "left" | "right" | "full">;
  marginTop?: ResponsiveValueOf<string>;
  marginBottom?: ResponsiveValueOf<string>;
  marginLeft?: ResponsiveValueOf<string>;
  marginRight?: ResponsiveValueOf<string>;
  margin?: ResponsiveValueOf<string>;
  figmaConstraints?: {
    horizontal?: "LEFT" | "RIGHT" | "LEFT_RIGHT" | "CENTER" | "SCALE";
    vertical?: "CENTER" | "SCALE" | "TOP" | "BOTTOM" | "TOP_BOTTOM";
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    parentWidth?: number;
    parentHeight?: number;
  };
  gap?: ResponsiveValueOf<string>;
  rowGap?: string | number;
  columnGap?: string | number;
  padding?: ResponsiveValueOf<string>;
  paddingTop?: ResponsiveValueOf<string | number>;
  paddingRight?: ResponsiveValueOf<string | number>;
  paddingBottom?: ResponsiveValueOf<string | number>;
  paddingLeft?: ResponsiveValueOf<string | number>;
  flex?: ResponsiveValueOf<string>;
  flexShrink?: number;
  flexGrow?: number;
  flexBasis?: ResponsiveValueOf<string>;
  order?: number;
  alignSelf?: ResponsiveValueOf<string>;
  flow?: ResponsiveValueOf<string>;
  align?: ResponsiveValueOf<string>;
  distribute?: ResponsiveValueOf<string>;
  wrap?: ResponsiveValueOf<"nowrap" | "wrap" | "wrap-reverse">;
};

export type MixedElementGroupIslandProps = Omit<GroupBase, "section"> &
  LayoutOverrides & {
    children: ReactNode;
    interactions?: {
      onClick?: unknown;
      onHoverEnter?: unknown;
      onHoverLeave?: unknown;
      onPointerDown?: unknown;
      onPointerUp?: unknown;
      onDoubleClick?: unknown;
      cursor?: string;
    };
    scroll?: string;
    layoutChildren?: boolean;
    motionTiming?: unknown;
    glassLayer?: "background" | "foreground";
  };

export function MixedElementGroupIsland({
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  display = "flex",
  flow,
  align,
  distribute,
  gap,
  rowGap,
  columnGap,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  wrap,
  flex,
  scroll,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  margin,
  selfAlign,
  figmaConstraints,
  borderRadius,
  wrapperStyle: groupWrapperStyle,
  borderGradient,
  effects,
  layoutChildren,
  interactions,
  motionTiming,
  flexShrink,
  flexGrow,
  flexBasis,
  order,
  alignSelf,
  glassLayer = "background",
  children,
}: MixedElementGroupIslandProps) {
  const pbContentGuidelines = getPbContentGuidelines();
  const framePaddingDefault = pbContentGuidelines.framePaddingDefault;
  const frameFlexDirectionDefault = pbContentGuidelines.frameFlexDirectionDefault;
  const frameAlignItemsDefault = pbContentGuidelines.frameAlignItemsDefault;
  const frameFlexWrapDefault = pbContentGuidelines.frameFlexWrapDefault;
  const frameJustifyContentDefault = pbContentGuidelines.frameJustifyContentDefault;
  const frameBorderRadiusDefault = pbContentGuidelines.frameBorderRadiusDefault;
  const { isMobile } = useDeviceType();
  const groupRef = useRef<HTMLDivElement>(null);

  const resolvedGroupWrapperStyle = useMemo(
    () =>
      lowerThemeStyleObject(groupWrapperStyle as Record<string, unknown> | undefined) as
        | CSSProperties
        | undefined,
    [groupWrapperStyle]
  );
  const resolvedBorderGradient = lowerThemeValueDeep(borderGradient) as BorderGradient | undefined;
  const { resolvedEffects: groupEffects, hasGlassEffect } = useElementEffects(effects);
  const effectCssStyle = useMemo(
    () => sectionEffectsToStyle((groupEffects ?? []).filter((effect) => effect.type !== "glass")),
    [groupEffects]
  );
  const glassInForeground = hasGlassEffect && glassLayer === "foreground";
  const contentStackingStyle: CSSProperties | undefined =
    hasGlassEffect && !glassInForeground
      ? { position: "relative", zIndex: globals.zIndexRaised }
      : undefined;

  const layoutStyle = getElementLayoutStyle(
    {
      width,
      height,
      borderRadius,
      constraints: {
        ...(minWidth != null ? { minWidth: String(minWidth) } : {}),
        ...(minHeight != null ? { minHeight: String(minHeight) } : {}),
        ...(maxWidth != null ? { maxWidth: String(maxWidth) } : {}),
        ...(maxHeight != null ? { maxHeight: String(maxHeight) } : {}),
      },
      selfAlign,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      margin,
      figmaConstraints,
    },
    isMobile
  );

  const resolvedFlexDirectionValue = resolveResponsiveValue(flow, isMobile);
  const resolvedAlignItemsValue = resolveResponsiveValue(align, isMobile);
  const resolvedJustifyContentValue = resolveResponsiveValue(distribute, isMobile);
  const resolvedGapValue = resolveResponsiveValue(gap, isMobile);
  const resolvedPaddingValue = resolveResponsiveValue(padding, isMobile);
  const resolvedPaddingTop = resolveResponsiveValue(paddingTop, isMobile);
  const resolvedPaddingRight = resolveResponsiveValue(paddingRight, isMobile);
  const resolvedPaddingBottom = resolveResponsiveValue(paddingBottom, isMobile);
  const resolvedPaddingLeft = resolveResponsiveValue(paddingLeft, isMobile);
  const resolvedFlexValue = resolveResponsiveValue(flex, isMobile);

  const resolvedFlexDirection =
    (coalesceEmptyString(resolvedFlexDirectionValue) as
      | CSSProperties["flexDirection"]
      | undefined) ?? frameFlexDirectionDefault;
  const resolvedAlignItems = normalizeFlexAlignItemsValue(
    coalesceEmptyString(resolvedAlignItemsValue) ?? frameAlignItemsDefault
  );
  const resolvedFlexWrap =
    (coalesceEmptyString(wrap) as CSSProperties["flexWrap"] | undefined) ?? frameFlexWrapDefault;

  const layoutRadius = layoutStyle.borderRadius;
  const effectiveBorderRadius =
    layoutRadius != null && String(layoutRadius).trim() !== ""
      ? layoutRadius
      : scaleRadiusForDensity(frameBorderRadiusDefault);

  const hasBorderGradient =
    resolvedBorderGradient != null &&
    typeof resolvedBorderGradient === "object" &&
    typeof resolvedBorderGradient.stroke === "string" &&
    (typeof resolvedBorderGradient.width === "string" ||
      typeof resolvedBorderGradient.width === "number");

  const resolvedFlexGap = resolveFrameGapCss(resolvedGapValue);
  const resolvedRowGap = resolveFrameRowGapCss(
    rowGap === undefined || rowGap === null ? rowGap : String(rowGap)
  );
  const resolvedColGap = resolveFrameColumnGapCss(
    columnGap === undefined || columnGap === null ? columnGap : String(columnGap)
  );
  const overlapGap = peblorOverlapGapToCss(resolvedGapValue);
  const resolvedJustifyContent = peblorJustifyContentForGap(
    normalizeFlexJustifyContentValue(
      coalesceEmptyString(resolvedJustifyContentValue) ?? frameJustifyContentDefault
    ) as CSSProperties["justifyContent"] | undefined,
    resolvedGapValue
  );

  const hasExplicitPadding =
    padding != null ||
    paddingTop != null ||
    paddingRight != null ||
    paddingBottom != null ||
    paddingLeft != null;

  const groupStyleBase: CSSProperties = {
    ...layoutStyle,
    borderRadius: effectiveBorderRadius,
    display: display as CSSProperties["display"],
    flexDirection: resolvedFlexDirection,
    alignItems: resolvedAlignItems,
    ...(resolvedJustifyContent ? { justifyContent: resolvedJustifyContent } : {}),
    ...(resolvedFlexGap != null ? { gap: resolvedFlexGap } : {}),
    ...(resolvedRowGap != null ? { rowGap: resolvedRowGap } : {}),
    ...(resolvedColGap != null ? { columnGap: resolvedColGap } : {}),
    ...(resolvedPaddingValue != null ? { padding: resolvedPaddingValue } : {}),
    ...(resolvedPaddingTop != null ? { paddingTop: resolvedPaddingTop } : {}),
    ...(resolvedPaddingRight != null ? { paddingRight: resolvedPaddingRight } : {}),
    ...(resolvedPaddingBottom != null ? { paddingBottom: resolvedPaddingBottom } : {}),
    ...(resolvedPaddingLeft != null ? { paddingLeft: resolvedPaddingLeft } : {}),
    ...(!hasExplicitPadding ? { padding: scaleSpaceShorthandForDensity(framePaddingDefault) } : {}),
    flexWrap: resolvedFlexWrap,
    ...(resolvedFlexValue ? { flex: resolvedFlexValue } : {}),
    ...(flexShrink != null ? { flexShrink } : {}),
    ...(flexGrow != null ? { flexGrow } : {}),
    ...(flexBasis != null ? { flexBasis: resolveResponsiveValue(flexBasis, isMobile) } : {}),
    ...(order != null ? { order } : {}),
    ...(alignSelf != null
      ? { alignSelf: resolveResponsiveValue(alignSelf, isMobile) as CSSProperties["alignSelf"] }
      : {}),
    overflow: (scroll ?? (layoutChildren ? "visible" : "hidden")) as CSSProperties["overflow"],
    ...(resolvedGroupWrapperStyle as CSSProperties),
  };

  const groupStyle: CSSProperties = {
    ...groupStyleBase,
    ...((hasBorderGradient || hasGlassEffect) && groupStyleBase.position == null
      ? { position: "relative" }
      : {}),
    ...(effectCssStyle != null && Object.keys(effectCssStyle).length > 0 ? effectCssStyle : {}),
  };

  const hasInteractions = hasElementInteractions(interactions);

  const motionTimingRecord = motionTiming as Record<string, unknown> | undefined;
  const staggerMs = (motionTimingRecord?.staggerChildren as number) ?? 0;
  const resolvedEntranceMotion = motionTimingRecord?.resolvedEntranceMotion as
    | Record<string, unknown>
    | undefined;
  const hasStagger = staggerMs > 0;

  const staggerVariants = useMemo(() => {
    if (!hasStagger) return null;
    const entrancePreset = motionTimingRecord?.entrancePreset;
    const fallbackInitial =
      entrancePreset === "fade"
        ? { opacity: 0 }
        : entrancePreset === "slideRight"
          ? { opacity: 0, x: -24 }
          : entrancePreset === "slideLeft"
            ? { opacity: 0, x: 24 }
            : { opacity: 0, y: 60 };
    const fallbackAnimate = { opacity: 1, x: 0, y: 0 };

    const initial = (resolvedEntranceMotion?.initial ?? fallbackInitial) as Record<
      string,
      string | number | number[]
    >;
    const animate = (resolvedEntranceMotion?.animate ?? fallbackAnimate) as Record<
      string,
      string | number | number[]
    >;
    const transition = resolvedEntranceMotion?.transition as Record<string, unknown> | undefined;
    const durationSec =
      (transition?.duration as number) ?? MOTION_DEFAULTS.groupEntranceDurationSec;
    const ease = (transition?.ease as Easing) ?? "easeOut";
    const delaySec = (transition?.delay as number) ?? 0;
    return {
      container: {
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerMs,
            delayChildren: delaySec,
          },
        },
      },
      item: {
        initial,
        animate: {
          ...animate,
          transition: {
            duration: durationSec,
            ease,
          },
        },
      },
    };
  }, [hasStagger, staggerMs, resolvedEntranceMotion, motionTimingRecord]);

  const renderedChildren = (() => {
    if (hasStagger && staggerVariants) {
      const items = Children.map(children, (child, index) => {
        const itemStyle: CSSProperties = {
          ...MOTION_WRAPPER_STYLE,
          ...(overlapGap && index > 0 ? { marginLeft: overlapGap as string } : {}),
        };
        return (
          <m.div key={index} variants={staggerVariants.item} style={itemStyle}>
            {child}
          </m.div>
        );
      });
      return (
        <m.div
          variants={staggerVariants.container}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          style={MOTION_WRAPPER_STYLE}
        >
          {items}
        </m.div>
      );
    }
    return overlapGap
      ? Children.map(children, (child, index) =>
          index > 0 ? <div style={{ marginLeft: overlapGap }}>{child}</div> : child
        )
      : children;
  })();

  return (
    <div
      ref={groupRef}
      style={{
        ...groupStyle,
        ...(interactions?.cursor ? { cursor: interactions.cursor } : {}),
      }}
      className={resolvedFlexValue ? undefined : "shrink-0"}
      onClick={
        interactions?.onClick
          ? () => firePeblorAction(interactions.onClick as PeblorAction, "trigger")
          : undefined
      }
      onPointerEnter={
        interactions?.onHoverEnter
          ? () => firePeblorAction(interactions.onHoverEnter as PeblorAction, "trigger")
          : undefined
      }
      onPointerLeave={
        interactions?.onHoverLeave
          ? () => firePeblorAction(interactions.onHoverLeave as PeblorAction, "trigger")
          : undefined
      }
      onPointerDown={
        interactions?.onPointerDown
          ? () => firePeblorAction(interactions.onPointerDown as PeblorAction, "trigger")
          : undefined
      }
      onPointerUp={
        interactions?.onPointerUp
          ? () => firePeblorAction(interactions.onPointerUp as PeblorAction, "trigger")
          : undefined
      }
      onDoubleClick={
        interactions?.onDoubleClick
          ? () => firePeblorAction(interactions.onDoubleClick as PeblorAction, "trigger")
          : undefined
      }
      tabIndex={hasInteractions ? 0 : undefined}
    >
      {!glassInForeground && (
        <SectionGlassEffect effects={groupEffects} sectionRef={groupRef} variant="auto" />
      )}
      {hasBorderGradient ? (
        <div
          aria-hidden
          style={buildBorderGradientOverlayStyle(
            resolvedBorderGradient as BorderGradient,
            groupStyle.borderRadius
          )}
        />
      ) : null}
      {contentStackingStyle ? (
        <div style={contentStackingStyle}>{renderedChildren}</div>
      ) : (
        renderedChildren
      )}
      {glassInForeground && (
        <SectionGlassEffect effects={groupEffects} sectionRef={groupRef} variant="auto" />
      )}
    </div>
  );
}
