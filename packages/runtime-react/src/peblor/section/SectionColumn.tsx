"use client";

import { useMemo, useRef } from "react";
import type { SectionBlock } from "@pb/contracts/types";
import { handleSectionWheel, getDefaultScrollSpeed } from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { useSectionBaseStyles } from "@/peblor/section/position/use-section-base-styles";
import { useStickyTrait } from "@/peblor/section/position/use-sticky-trait";
import { useFixedTrait } from "@/peblor/section/position/use-fixed-trait";
import { applySectionFillStyle } from "@pb/core/layout";
import { LayerStack } from "./stack/LayerStack";
import { SectionGlassEffect } from "./stack/SectionGlassEffect";
import { useSectionViewportTrigger } from "@/peblor/triggers/core/use-section-viewport-trigger";
import { useColumnLayout } from "@/peblor/hooks/use-column-layout";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import {
  normalizeColumnSpanInput,
  resolveResponsiveBooleanProp,
  resolveResponsiveStringProp,
} from "./SectionColumn/section-column-prop-normalizers";
import { SectionColumnContent } from "./SectionColumn/section-column-content";
import { SectionMotionWrapper } from "@/peblor/integrations/framer-motion";
import { SectionScrollTargetProvider } from "@/peblor/section/position/SectionScrollTargetContext";
import { useSectionCustomTriggers } from "@/peblor/triggers/core/use-section-custom-triggers";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeString } from "@/peblor/theme/theme-string";

type Props = Extract<SectionBlock, { type: "sectionColumn" }>;

export function SectionColumn({
  id,
  ariaLabel,
  fill,
  layers,
  effects,
  width,
  height,
  align,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  borderRadius,
  border,
  boxShadow,
  filter,
  backdropFilter,
  clipPath,
  cursor,
  aspectRatio,
  scrollSpeed = getDefaultScrollSpeed(),
  initialX,
  initialY,
  zIndex,
  elements = [],
  columns,
  columnAssignments,
  columnWidths,
  columnGaps,
  columnStyles,
  itemStyles,
  gridMode,
  gridDebug,
  gridAutoRows,
  itemLayout,
  elementOrder,
  columnSpan: _columnSpan,
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
  reduceMotion,
  keyboardTriggers,
  timerTriggers,
  cursorTriggers,
  scrollDirectionTriggers,
  idleTriggers,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useDeviceType();
  const themeMode = usePeblorThemeMode();
  const resolvedAriaLabel = resolveResponsiveValue(ariaLabel, isMobile) ?? id ?? "Column layout";
  const resolvedFill = resolveThemeString(resolveResponsiveValue(fill, isMobile), themeMode);
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
  });

  const { baseStyle, resolvedLayout, alignStyle, transformY, hasInitialPosition } =
    useSectionBaseStyles({
      fill,
      width,
      height,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      align,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
      borderRadius,
      border,
      boxShadow,
      filter,
      backdropFilter,
      clipPath,
      cursor,
      aspectRatio,
      scrollSpeed,
      initialX,
      initialY,
      zIndex,
      effects,
      sectionRef,
      usePadding: true,
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
    transformY,
  });

  const fixedStyleOverrides = useFixedTrait({
    fixed,
    fixedPosition,
    fixedOffset: resolvedFixedOffset,
    resolvedLayout,
    zIndex,
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

  const normalizedColumnSpan = normalizeColumnSpanInput(_columnSpan);
  const resolvedGridDebug = resolveResponsiveBooleanProp(gridDebug, isMobile);
  const resolvedGridAutoRows = resolveResponsiveStringProp(gridAutoRows, isMobile);

  const columnLayout = useColumnLayout({
    elements,
    columns,
    columnAssignments,
    columnWidths,
    columnGaps,
    columnStyles,
    columnSpan: normalizedColumnSpan,
    itemStyles,
    gridMode,
    itemLayout,
    elementOrder,
    contentWidth,
    contentHeight,
  });

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
        className="relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0"
        style={applySectionFillStyle(resolvedFill, layers, finalStyle)}
        aria-label={resolvedAriaLabel}
        onWheel={fixed ? undefined : wheelHandler}
      >
        <SectionScrollTargetProvider sectionRef={sectionRef}>
          {layers?.length ? <LayerStack layers={layers} /> : null}
          <SectionGlassEffect effects={effects} sectionRef={sectionRef} isSectionFixed={!!fixed} />
          <SectionColumnContent
            elements={elements}
            columnLayout={columnLayout}
            gridDebug={resolvedGridDebug}
            gridAutoRows={resolvedGridAutoRows}
          />
        </SectionScrollTargetProvider>
      </SectionMotionWrapper>
    </>
  );
}
