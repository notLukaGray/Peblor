"use client";

import { useMemo, type CSSProperties } from "react";
import type { BaseSectionProps } from "@pb/contracts/types";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { getDefaultScrollSpeed } from "@pb/core/layout";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { useSectionParallax } from "./use-section-parallax";
import { useSectionPositioning } from "./use-section-positioning";
import { lowerThemeStyleObject, lowerThemeValueDeep } from "@/peblor/theme/theme-string";
import {
  buildSectionBaseStyle,
  type ResolvedSectionLayout as ResolvedSectionLayoutType,
} from "@/peblor/utils/section-base-style-utils";

type UseSectionBaseStylesProps = Pick<
  BaseSectionProps,
  | "id"
  | "ariaLabel"
  | "fill"
  | "layers"
  | "effects"
  | "width"
  | "height"
  | "minWidth"
  | "maxWidth"
  | "minHeight"
  | "maxHeight"
  | "selfAlign"
  | "marginLeft"
  | "marginRight"
  | "marginTop"
  | "marginBottom"
  | "margin"
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "sectionGap"
  | "wrapperStyle"
  | "borderRadius"
  | "border"
  | "boxShadow"
  | "filter"
  | "bgBlur"
  | "clipShape"
  | "cursor"
  | "opacity"
  | "position"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "inset"
  | "scroll"
  | "scrollX"
  | "scrollY"
  | "aspectRatio"
  | "scrollSpeed"
  | "initialX"
  | "initialY"
  | "layer"
  | "interaction"
  | "selectable"
  | "willChange"
  | "reduceMotion"
> & {
  sectionRef: React.RefObject<HTMLElement | null>;
};

export type ResolvedSectionLayout = ResolvedSectionLayoutType & {
  selfAlign: "left" | "center" | "right" | "full" | undefined;
  marginLeft: string | undefined;
  marginRight: string | undefined;
  marginTop: string | undefined;
  marginBottom: string | undefined;
  margin: string | undefined;
  padding: string | undefined;
  paddingTop: string | undefined;
  paddingRight: string | undefined;
  paddingBottom: string | undefined;
  paddingLeft: string | undefined;
  sectionGap: string | undefined;
  position: string | undefined;
  top: string | undefined;
  right: string | undefined;
  bottom: string | undefined;
  left: string | undefined;
  inset: string | undefined;
  scrollX: string | undefined;
  scrollY: string | undefined;
  initialX: string | undefined;
  initialY: string | undefined;
};

export function useSectionBaseStyles({
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
  margin,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  sectionGap,
  wrapperStyle,
  borderRadius,
  border,
  boxShadow,
  filter,
  bgBlur,
  clipShape,
  cursor,
  opacity,
  position,
  top,
  right,
  bottom,
  left,
  inset,
  scroll,
  scrollX,
  scrollY,
  aspectRatio,
  scrollSpeed = getDefaultScrollSpeed(),
  initialX,
  initialY,
  layer,
  effects,
  sectionRef,
  interaction,
  selectable,
  willChange,
  reduceMotion,
}: UseSectionBaseStylesProps) {
  const { isMobile } = useDeviceType();

  const resolvedLayout = useMemo<ResolvedSectionLayout>(
    () => ({
      width: resolveResponsiveValue(width, isMobile),
      height: resolveResponsiveValue(height, isMobile),
      minWidth: resolveResponsiveValue(minWidth, isMobile),
      maxWidth: resolveResponsiveValue(maxWidth, isMobile),
      minHeight: resolveResponsiveValue(minHeight, isMobile),
      maxHeight: resolveResponsiveValue(maxHeight, isMobile),
      selfAlign: resolveResponsiveValue(selfAlign, isMobile) as
        | ResolvedSectionLayout["selfAlign"]
        | undefined,
      marginLeft: resolveResponsiveValue(marginLeft, isMobile),
      marginRight: resolveResponsiveValue(marginRight, isMobile),
      marginTop: resolveResponsiveValue(marginTop, isMobile),
      marginBottom: resolveResponsiveValue(marginBottom, isMobile),
      margin: resolveResponsiveValue(margin, isMobile),
      padding: resolveResponsiveValue(padding, isMobile),
      paddingTop: resolveResponsiveValue(paddingTop, isMobile),
      paddingRight: resolveResponsiveValue(paddingRight, isMobile),
      paddingBottom: resolveResponsiveValue(paddingBottom, isMobile),
      paddingLeft: resolveResponsiveValue(paddingLeft, isMobile),
      sectionGap: resolveResponsiveValue(sectionGap, isMobile),
      position: resolveResponsiveValue(position, isMobile),
      top: resolveResponsiveValue(top, isMobile),
      right: resolveResponsiveValue(right, isMobile),
      bottom: resolveResponsiveValue(bottom, isMobile),
      left: resolveResponsiveValue(left, isMobile),
      inset: resolveResponsiveValue(inset, isMobile),
      scrollX: resolveResponsiveValue(scrollX, isMobile) as string | undefined,
      scrollY: resolveResponsiveValue(scrollY, isMobile) as string | undefined,
      initialX: resolveResponsiveValue(initialX, isMobile),
      initialY: resolveResponsiveValue(initialY, isMobile),
    }),
    [
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
      margin,
      padding,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      sectionGap,
      position,
      top,
      right,
      bottom,
      left,
      inset,
      scrollX,
      scrollY,
      initialX,
      initialY,
      isMobile,
    ]
  );

  const parallaxY = useSectionParallax(scrollSpeed, resolvedLayout.initialY, sectionRef, {
    respectReducedMotion: reduceMotion !== false,
  });
  const { alignStyle, positioningStyle, shouldApplyAlignStyle, hasInitialPosition } =
    useSectionPositioning({
      align: resolvedLayout.selfAlign,
      width: resolvedLayout.width,
      initialX: resolvedLayout.initialX,
      initialY: resolvedLayout.initialY,
    });

  const resolvedBorderRadius = resolveResponsiveValue(borderRadius, isMobile);
  const resolvedAspectRatio = resolveResponsiveValue(aspectRatio, isMobile);
  const resolvedOverflow = resolveResponsiveValue(scroll, isMobile);
  const resolvedBorder = useMemo(() => lowerThemeValueDeep(border) as typeof border, [border]);
  const resolvedEffects = useMemo(() => lowerThemeValueDeep(effects) as typeof effects, [effects]);

  const resolvedWrapperStyle = useMemo(
    () =>
      lowerThemeStyleObject(wrapperStyle as Record<string, unknown> | undefined) as
        | Record<string, unknown>
        | undefined,
    [wrapperStyle]
  );

  const baseStyle = useMemo<CSSProperties>(() => {
    const style = buildSectionBaseStyle({
      width: resolvedLayout.width,
      height: resolvedLayout.height,
      minWidth: resolvedLayout.minWidth,
      maxWidth: resolvedLayout.maxWidth,
      minHeight: resolvedLayout.minHeight,
      maxHeight: resolvedLayout.maxHeight,
      align: resolvedLayout.selfAlign,
      initialX: resolvedLayout.initialX,
      initialY: resolvedLayout.initialY,
      borderRadius: resolvedBorderRadius,
      border: resolvedBorder,
      resolvedOverflow,
      resolvedOverflowX: resolvedLayout.scrollX,
      resolvedOverflowY: resolvedLayout.scrollY,
      zIndex: layer,
      resolvedEffects,
      boxShadow,
      filter,
      backdropFilter: bgBlur,
      clipPath: clipShape,
      cursor,
      aspectRatio: resolvedAspectRatio,
      padding: resolvedLayout.padding,
      paddingTop: resolvedLayout.paddingTop,
      paddingRight: resolvedLayout.paddingRight,
      paddingBottom: resolvedLayout.paddingBottom,
      paddingLeft: resolvedLayout.paddingLeft,
      margin: resolvedLayout.margin,
      marginTop: resolvedLayout.marginTop,
      marginRight: resolvedLayout.marginRight,
      marginBottom: resolvedLayout.marginBottom,
      marginLeft: resolvedLayout.marginLeft,
      sectionGap: resolvedLayout.sectionGap,
      resolvedPosition: resolvedLayout.position,
      top: resolvedLayout.top,
      right: resolvedLayout.right,
      bottom: resolvedLayout.bottom,
      left: resolvedLayout.left,
      inset: resolvedLayout.inset,
      pointerEvents: interaction,
      userSelect: selectable,
      willChange,
      opacity,
      wrapperStyle: resolvedWrapperStyle,
      resolvedFill: undefined,
      layers: undefined,
    });

    return style;
  }, [
    resolvedLayout,
    resolvedBorderRadius,
    resolvedBorder,
    layer,
    resolvedEffects,
    boxShadow,
    filter,
    bgBlur,
    clipShape,
    cursor,
    resolvedAspectRatio,
    resolvedOverflow,
    resolvedWrapperStyle,
    opacity,
    interaction,
    selectable,
    willChange,
  ]);

  return {
    baseStyle,
    parallaxY,
    alignStyle,
    positioningStyle,
    shouldApplyAlignStyle,
    resolvedLayout,
    hasInitialPosition,
  };
}
