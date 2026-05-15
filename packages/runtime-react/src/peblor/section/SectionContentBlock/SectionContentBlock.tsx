"use client";

import { useMemo, useRef, type CSSProperties } from "react";
import { useShallow } from "zustand/react/shallow";
import type {
  SectionBlock,
  SectionDefinitionBlock,
} from "@pb/contracts/peblor/core/peblor-schemas";
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
} from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { SectionMotionWrapper } from "@/peblor/integrations/framer-motion";
import { applySectionFillStyle } from "@pb/core/layout";
import { useSectionBaseStyles } from "@/peblor/section/position/use-section-base-styles";
import { useStickyTrait } from "@/peblor/section/position/use-sticky-trait";
import { useFixedTrait } from "@/peblor/section/position/use-fixed-trait";
import { LayerStack } from "@/peblor/section/stack/LayerStack";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { useSectionViewportTrigger } from "@/peblor/triggers/core/use-section-viewport-trigger";
import {
  buildSectionContentWrapperStyle,
  sectionHeightCanStretchContent,
} from "./section-content-block-content-wrapper-style";
import { resolveSectionContentBlockElements } from "./section-content-block-element-resolution";
import { ReorderableElementList } from "./ReorderableElementList";
import { SectionContentBlockElementList } from "./SectionContentBlockElementList";
import { useSectionScrollOpacityStyle } from "@/peblor/integrations/framer-motion/scroll-style";
import { SectionScrollTargetProvider } from "@/peblor/section/position/SectionScrollTargetContext";
import { useSectionCustomTriggers } from "@/peblor/triggers/core/use-section-custom-triggers";
import { useVariableStore } from "@/peblor/runtime/peblor-variable-store";
import {
  evaluateConditions,
  type VisibleWhenConfig,
} from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import type { JsonValue } from "@pb/contracts/types";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeString } from "@/peblor/theme/theme-string";

type ContentBlockBase = Extract<SectionBlock, { type: "contentBlock" }>;
type Props = ContentBlockBase & {
  elementOrder?: string[] | { mobile?: string[]; desktop?: string[] };
  definitions?: Record<string, SectionDefinitionBlock>;
  visibleWhen?: VisibleWhenConfig;
};

export function SectionContentBlock({
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
  overflow,
  scrollSpeed = getDefaultScrollSpeed(),
  initialX,
  initialY,
  zIndex,
  elements: elementsProp = [],
  elementOrder,
  reorderable,
  reorderAxis,
  reorderDragUnit,
  reorderDragBehavior,
  flexDirection,
  alignItems,
  justifyContent,
  flexWrap,
  gap,
  rowGap,
  columnGap,
  definitions: sectionDefinitions,
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
  visibleWhen,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useDeviceType();
  const resolvedAriaLabel = resolveResponsiveValue(ariaLabel, isMobile) ?? id ?? "Content block";

  const elements = useMemo(
    () =>
      resolveSectionContentBlockElements({
        elementsProp,
        elementOrder,
        sectionDefinitions,
      }),
    [elementsProp, elementOrder, sectionDefinitions]
  );

  const themeMode = usePeblorThemeMode();
  const resolvedFill = resolveThemeString(resolveResponsiveValue(fill, isMobile), themeMode);
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
  });

  // visibleWhen — always call hook unconditionally; conditionally return null after all hooks
  // Subscribe only to the variable keys referenced by this section's visibleWhen condition
  // so that unrelated setVariable calls don't re-render every section.
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

  const resolvedShellOverflow = fixed
    ? ("visible" as const)
    : (resolveResponsiveValue(overflow, isMobile) ?? ("hidden" as const));
  const shellOverflowClass =
    resolvedShellOverflow === "visible"
      ? "overflow-visible"
      : resolvedShellOverflow === "auto"
        ? "overflow-auto"
        : resolvedShellOverflow === "scroll"
          ? "overflow-scroll"
          : "overflow-hidden";

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
      overflow: fixed ? "visible" : overflow,
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

  const resolvedContentWidth = resolveResponsiveValue(contentWidth, isMobile);
  const resolvedContentHeight = resolveResponsiveValue(contentHeight, isMobile);
  const resolvedFlexDirection =
    (coalesceEmptyString(resolveResponsiveValue(flexDirection, isMobile)) as
      | CSSProperties["flexDirection"]
      | undefined) ?? pbContentGuidelines.frameFlexDirectionDefault;
  const resolvedAlignItems = normalizeFlexAlignItemsValue(
    coalesceEmptyString(resolveResponsiveValue(alignItems, isMobile)) ??
      pbContentGuidelines.frameAlignItemsDefault
  );
  const resolvedFlexWrap =
    (coalesceEmptyString(resolveResponsiveValue(flexWrap, isMobile)) as
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
      coalesceEmptyString(resolveResponsiveValue(justifyContent, isMobile)) ??
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
        elementCount: elements.length,
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
      elements.length,
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

  const sectionShellStyle = useMemo(
    (): CSSProperties => ({
      ...applySectionFillStyle(resolvedFill, layers, finalStyle),
      ...(scrollOpacityStyle ?? {}),
      ...(process.env.NODE_ENV === "development" && elements.length > 0
        ? { minHeight: "1px" }
        : {}),
    }),
    [resolvedFill, layers, finalStyle, scrollOpacityStyle, elements.length]
  );

  const sectionProps = useMemo(
    () => ({
      className: `relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0 ${shellOverflowClass}`,
      style: sectionShellStyle,
      "aria-label": resolvedAriaLabel,
      "data-section-type": "contentBlock" as const,
      "data-elements-count": elements.length,
      onWheel: fixed ? undefined : wheelHandler,
    }),
    [shellOverflowClass, sectionShellStyle, resolvedAriaLabel, elements.length, fixed, wheelHandler]
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
        {reorderable ? (
          <ReorderableElementList
            elements={elements}
            sectionDefinitions={sectionDefinitions}
            axis={reorderAxis ?? "y"}
            dragUnit={reorderDragUnit ?? "frame"}
            dragBehavior={reorderDragBehavior ?? "elasticSnap"}
          />
        ) : (
          <SectionContentBlockElementList
            elements={elements}
            sectionDefinitions={sectionDefinitions}
          />
        )}
      </div>
    </>
  );

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
        {...sectionProps}
      >
        <SectionScrollTargetProvider sectionRef={sectionRef}>
          {sectionContent}
        </SectionScrollTargetProvider>
      </SectionMotionWrapper>
    </>
  );
}
