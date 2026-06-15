"use client";

import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import type { SectionBlock } from "@pb/contracts/types";
import { handleSectionWheel, getDefaultScrollSpeed } from "@pb/core/layout";
import { getPbContentGuidelines } from "@pb/core/host";
import {
  coalesceEmptyString,
  normalizeFlexAlignItemsValue,
  normalizeFlexJustifyContentValue,
  peblorJustifyContentForGap,
  resolveFrameColumnGapCss,
  resolveFrameGapCss,
  resolveFrameRowGapCss,
  applySectionFillStyle,
} from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { SectionMotionWrapper } from "@/peblor/integrations/framer-motion";
import { useSectionBaseStyles } from "@/peblor/section/position/use-section-base-styles";
import { useStickyTrait } from "@/peblor/section/position/use-sticky-trait";
import { useFixedTrait } from "@/peblor/section/position/use-fixed-trait";
import { LayerStack } from "@/peblor/section/stack/LayerStack";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { useSectionViewportTrigger } from "@/peblor/triggers/core/use-section-viewport-trigger";
import {
  buildSectionContentWrapperStyle,
  sectionHeightCanStretchContent,
} from "@/peblor/section/SectionContentBlock/section-content-block-content-wrapper-style";
import { useSectionScrollOpacityStyle } from "@/peblor/integrations/framer-motion/scroll-style";
import { SectionScrollTargetProvider } from "@/peblor/section/position/SectionScrollTargetContext";
import { useSectionCustomTriggers } from "@/peblor/triggers/core/use-section-custom-triggers";
import {
  evaluateConditions,
  type VisibleWhenConfig,
} from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import { useVisibleWhenVariables } from "@/peblor/elements/Shared/use-live-variable-bindings";
import { lowerThemeStringToCss } from "@/peblor/theme/theme-string";
import { globals } from "@pb/runtime-react/core/lib/globals";

type ContentBlockBase = Extract<SectionBlock, { type: "contentBlock" }>;

export type MixedSectionContentBlockIslandProps = Omit<
  ContentBlockBase,
  "elements" | "visibleWhen"
> & {
  visibleWhen?: VisibleWhenConfig;
  children: ReactNode;
  elementCount: number;
};

export function MixedSectionContentBlockIsland({
  id,
  ariaLabel,
  fill,
  layers,
  effects,
  width,
  height,
  selfAlign,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  borderRadius,
  border,
  boxShadow,
  filter,
  bgBlur,
  clipShape,
  cursor,
  aspectRatio,
  scroll,
  scrollX,
  scrollY,
  scrollSpeed = getDefaultScrollSpeed(),
  initialX,
  initialY,
  layer,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  margin,
  wrapperStyle,
  sectionGap,
  position,
  top,
  right,
  bottom,
  left,
  inset,
  interaction,
  selectable,
  willChange,
  opacity,
  flow,
  align,
  distribute,
  wrap,
  gap,
  rowGap,
  columnGap,
  contentWidth,
  contentHeight,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  sticky,
  stickyOffset = "0px",
  stickyPosition = "top",
  fixed,
  fixedPosition = "top",
  fixedOffset = "0px",
  onVisible,
  onInvisible,
  onProgress,
  onViewportProgress,
  threshold,
  triggerOnce,
  rootMargin,
  delay,
  motion: motionFromJson,
  motionTiming,
  scrollOpacityRange,
  reduceMotion,
  keyboardTriggers,
  timerTriggers,
  cursorTriggers,
  scrollDirectionTriggers,
  idleTriggers,
  variableTriggers,
  tabVisibilityTriggers,
  mediaEndTriggers,
  customEventTriggers,
  elementEventTriggers,
  scrollThresholdTriggers,
  mediaProgressTriggers,
  visibleWhen,
  children,
  elementCount,
}: MixedSectionContentBlockIslandProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useDeviceType();
  const resolvedAriaLabel =
    resolveResponsiveValue(ariaLabel, isMobile) ?? id ?? globals.stringsAriaLabelContentBlock;

  const resolvedFill = lowerThemeStringToCss(resolveResponsiveValue(fill, isMobile));
  const resolvedStickyOffset = resolveResponsiveValue(stickyOffset, isMobile) ?? "0px";
  const resolvedFixedOffset = resolveResponsiveValue(fixedOffset, isMobile) ?? "0px";
  const pbContentGuidelines = getPbContentGuidelines();

  const scrollOpacityStyle = useSectionScrollOpacityStyle(sectionRef, scrollOpacityRange, {
    respectReducedMotion: reduceMotion !== false,
  });

  useSectionViewportTrigger(sectionRef, {
    onVisible,
    onInvisible,
    onProgress,
    onViewportProgress,
    threshold,
    triggerOnce,
    rootMargin,
    delay,
  });

  useSectionCustomTriggers({
    keyboardTriggers,
    timerTriggers,
    cursorTriggers,
    scrollDirectionTriggers,
    idleTriggers,
    variableTriggers,
    tabVisibilityTriggers,
    mediaEndTriggers,
    customEventTriggers,
    elementEventTriggers,
    scrollThresholdTriggers,
    mediaProgressTriggers,
  });

  const variables = useVisibleWhenVariables(visibleWhen);

  const resolvedShellOverflow = fixed
    ? ("visible" as const)
    : (resolveResponsiveValue(scroll, isMobile) ?? ("hidden" as const));
  const shellOverflowClass =
    resolvedShellOverflow === "visible"
      ? "overflow-visible"
      : resolvedShellOverflow === "auto"
        ? "overflow-auto"
        : resolvedShellOverflow === "scroll"
          ? "overflow-scroll"
          : "overflow-hidden";

  const { baseStyle, resolvedLayout, alignStyle, parallaxY, hasInitialPosition } =
    useSectionBaseStyles({
      fill,
      width,
      height,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      selfAlign,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
      borderRadius,
      border,
      boxShadow,
      filter,
      bgBlur,
      clipShape,
      cursor,
      aspectRatio,
      scroll: fixed ? "visible" : scroll,
      scrollX,
      scrollY,
      scrollSpeed,
      initialX,
      initialY,
      layer,
      padding,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      margin,
      wrapperStyle,
      sectionGap,
      position,
      top,
      right,
      bottom,
      left,
      inset,
      interaction,
      selectable,
      willChange,
      opacity,
      effects,
      sectionRef,
      reduceMotion,
    });

  const { styleOverrides, placeholderStyle, showPlaceholder } = useStickyTrait({
    sectionRef,
    placeholderRef,
    sticky,
    stickyOffset: resolvedStickyOffset,
    stickyPosition,
    hasInitialPosition,
    resolvedLayout,
    alignStyle,
  });

  const fixedStyleOverrides = useFixedTrait({
    fixed,
    fixedPosition,
    fixedOffset: resolvedFixedOffset,
    resolvedLayout,
    zIndex: layer,
  });

  const finalStyle = useMemo(() => {
    if (fixed) return { ...baseStyle, ...fixedStyleOverrides };
    if (sticky) return { ...baseStyle, ...styleOverrides };
    return baseStyle;
  }, [fixed, sticky, baseStyle, fixedStyleOverrides, styleOverrides]);

  const wheelHandler = useMemo(
    () => (e: React.WheelEvent<HTMLElement>) => handleSectionWheel(e, scrollSpeed),
    [scrollSpeed]
  );

  const resolvedContentWidth = resolveResponsiveValue(contentWidth, isMobile);
  const resolvedContentHeight = resolveResponsiveValue(contentHeight, isMobile);
  const resolvedFlexDirection =
    (coalesceEmptyString(resolveResponsiveValue(flow, isMobile)) as
      | CSSProperties["flexDirection"]
      | undefined) ?? pbContentGuidelines.frameFlexDirectionDefault;
  const resolvedAlignItems = normalizeFlexAlignItemsValue(
    coalesceEmptyString(resolveResponsiveValue(align, isMobile)) ??
      pbContentGuidelines.frameAlignItemsDefault
  );
  const resolvedFlexWrap =
    (coalesceEmptyString(resolveResponsiveValue(wrap, isMobile)) as
      | CSSProperties["flexWrap"]
      | undefined) ?? pbContentGuidelines.frameFlexWrapDefault;
  const rawGap = coalesceEmptyString(resolveResponsiveValue(gap, isMobile));
  const rawRowGap = coalesceEmptyString(resolveResponsiveValue(rowGap, isMobile));
  const rawColumnGap = coalesceEmptyString(resolveResponsiveValue(columnGap, isMobile));
  const resolvedGap = resolveFrameGapCss(rawGap);
  const resolvedRowGap = resolveFrameRowGapCss(rawRowGap);
  const resolvedColumnGap = resolveFrameColumnGapCss(rawColumnGap);
  const resolvedJustifyContent = peblorJustifyContentForGap(
    normalizeFlexJustifyContentValue(
      coalesceEmptyString(resolveResponsiveValue(distribute, isMobile)) ??
        pbContentGuidelines.frameJustifyContentDefault
    ) as CSSProperties["justifyContent"] | undefined,
    rawGap
  );
  const contentBackgroundWhenLayers = layers?.length && resolvedFill ? resolvedFill : undefined;
  const contentWrapperStyle = useMemo(
    () => ({
      ...buildSectionContentWrapperStyle({
        resolvedContentWidth,
        resolvedContentHeight,
        sectionHasExplicitHeight: sectionHeightCanStretchContent(resolvedLayout?.height),
        elementCount,
        contentBackground: contentBackgroundWhenLayers,
      }),
      display: "flex",
      flexDirection: resolvedFlexDirection,
      alignItems: resolvedAlignItems,
      flexWrap: resolvedFlexWrap,
      ...(resolvedJustifyContent ? { justifyContent: resolvedJustifyContent } : {}),
      ...(resolvedGap != null ? { gap: resolvedGap } : {}),
      ...(resolvedRowGap != null ? { rowGap: resolvedRowGap } : {}),
      ...(resolvedColumnGap != null ? { columnGap: resolvedColumnGap } : {}),
    }),
    [
      resolvedContentWidth,
      resolvedContentHeight,
      resolvedLayout?.height,
      elementCount,
      contentBackgroundWhenLayers,
      resolvedFlexDirection,
      resolvedAlignItems,
      resolvedFlexWrap,
      resolvedJustifyContent,
      resolvedGap,
      resolvedRowGap,
      resolvedColumnGap,
    ]
  );

  const sectionContent = (
    <>
      {layers?.length ? (
        <LayerStack layers={layers} />
      ) : resolvedFill ? (
        <LayerStack fill={resolvedFill} />
      ) : null}
      <SectionGlassEffect effects={effects} sectionRef={sectionRef} isSectionFixed={!!fixed} />
      <div className="relative z-[var(--pb-z-raised)] min-h-0" style={contentWrapperStyle}>
        {children}
      </div>
    </>
  );

  const sectionProps = {
    id,
    className: `relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0 ${shellOverflowClass}`,
    style: {
      ...applySectionFillStyle(resolvedFill, layers, finalStyle),
      ...(scrollOpacityStyle ?? {}),
      ...(process.env.NODE_ENV === "development" && elementCount > 0 && { minHeight: "1px" }),
    },
    "aria-label": resolvedAriaLabel,
    "data-section-type": "contentBlock",
    "data-elements-count": elementCount,
    onWheel: fixed ? undefined : wheelHandler,
  };

  if (visibleWhen && !evaluateConditions(visibleWhen, variables)) return null;

  return (
    <>
      {!fixed && showPlaceholder && (
        <div ref={placeholderRef} style={placeholderStyle} aria-hidden />
      )}
      <SectionMotionWrapper
        sectionRef={sectionRef}
        motion={motionFromJson}
        motionTiming={motionTiming}
        reduceMotion={reduceMotion}
        parallaxY={parallaxY}
        {...sectionProps}
      >
        <SectionScrollTargetProvider sectionRef={sectionRef}>
          {sectionContent}
        </SectionScrollTargetProvider>
      </SectionMotionWrapper>
    </>
  );
}
