"use client";

import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import type { SectionBlock } from "@pb/contracts/types";
import {
  handleSectionWheel,
  getDefaultScrollSpeed,
  applySectionFillStyle,
  getColumnFlexStyles,
} from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { gridTemplateFromFlexStyles } from "@/peblor/section/SectionColumnGrid/section-column-grid-rendering";
import { SectionMotionWrapper } from "@/peblor/integrations/framer-motion";
import { useSectionBaseStyles } from "@/peblor/section/position/use-section-base-styles";
import { useStickyTrait } from "@/peblor/section/position/use-sticky-trait";
import { useFixedTrait } from "@/peblor/section/position/use-fixed-trait";
import { LayerStack } from "@/peblor/section/stack/LayerStack";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { useSectionViewportTrigger } from "@/peblor/triggers/core/use-section-viewport-trigger";
import { useSectionCustomTriggers } from "@/peblor/triggers/core/use-section-custom-triggers";
import { SectionScrollTargetProvider } from "@/peblor/section/position/SectionScrollTargetContext";
import { lowerThemeStringToCss } from "@/peblor/theme/theme-string";
import { resolveResponsiveUnknown } from "@/peblor/utils/resolve-responsive-unknown";
import { globals } from "@pb/runtime-react/core/lib/globals";

type SectionColumnBase = Extract<SectionBlock, { type: "sectionColumn" }>;

export type MixedSectionColumnIslandProps = Omit<SectionColumnBase, "elements"> & {
  children: ReactNode;
};

export function MixedSectionColumnIsland({
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
  scroll,
  scrollX,
  scrollY,
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
  columns,
  columnGaps,
  columnWidths,
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
  children,
}: MixedSectionColumnIslandProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useDeviceType();
  const resolvedAriaLabel =
    resolveResponsiveValue(ariaLabel, isMobile) ?? id ?? globals.stringsAriaLabelColumnLayout;
  const resolvedFill = lowerThemeStringToCss(resolveResponsiveValue(fill, isMobile));
  const resolvedStickyOffset = resolveResponsiveValue(stickyOffset, isMobile) ?? "0px";
  const resolvedFixedOffset = resolveResponsiveValue(fixedOffset, isMobile) ?? "0px";

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
      scroll,
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

  const resolvedColumns = (resolveResponsiveUnknown(columns, isMobile) as number | undefined) ?? 1;
  const resolvedColumnGap =
    (resolveResponsiveUnknown(columnGaps, isMobile) as string | undefined) ?? "1rem";

  const resolvedColumnWidths = useMemo(
    () => resolveResponsiveUnknown(columnWidths, isMobile),
    [columnWidths, isMobile]
  );
  const columnFlexStyles = useMemo(
    () =>
      getColumnFlexStyles(
        resolvedColumnWidths as Parameters<typeof getColumnFlexStyles>[0],
        resolvedColumns
      ),
    [resolvedColumnWidths, resolvedColumns]
  );
  const gridTemplateColumns = useMemo(
    () => gridTemplateFromFlexStyles(columnFlexStyles, { forCssGrid: true }),
    [columnFlexStyles]
  );

  const gridStyle: CSSProperties = {
    position: "relative",
    zIndex: globals.zIndexColumnGrid,
    display: "grid",
    gridTemplateColumns,
    gap: resolvedColumnGap,
    width: "100%",
  };

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
        className="relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0"
        style={applySectionFillStyle(resolvedFill, layers, finalStyle)}
        aria-label={resolvedAriaLabel}
        onWheel={fixed ? undefined : wheelHandler}
      >
        <SectionScrollTargetProvider sectionRef={sectionRef}>
          {layers?.length ? <LayerStack layers={layers} /> : null}
          <SectionGlassEffect effects={effects} sectionRef={sectionRef} isSectionFixed={!!fixed} />
          <div style={gridStyle} data-pb-grid="">
            {children}
          </div>
        </SectionScrollTargetProvider>
      </SectionMotionWrapper>
    </>
  );
}
