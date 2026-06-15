import type { CSSProperties } from "react";
import type { BaseSectionProps } from "@pb/contracts/types";
import { applySectionFillStyle } from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import {
  lowerThemeStringToCss,
  lowerThemeStyleObject,
  lowerThemeValueDeep,
} from "../../theme/theme-string";
import { buildSectionBaseStyle } from "@/peblor/utils/section-base-style-utils";

export type ServerSectionBaseStyleResult = {
  style: CSSProperties;
  resolvedFill: string | undefined;
  resolvedHeight: string | undefined;
};

export function buildServerSectionBaseStyle(
  section: Pick<
    BaseSectionProps,
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
    | "initialX"
    | "initialY"
    | "layer"
    | "interaction"
    | "selectable"
    | "willChange"
    | "colorScheme"
  >,
  serverIsMobile: boolean | undefined
): ServerSectionBaseStyleResult {
  const isMobile = serverIsMobile ?? false;
  const width = resolveResponsiveValue(section.width, isMobile);
  const height = resolveResponsiveValue(section.height, isMobile);
  const minWidth = resolveResponsiveValue(section.minWidth, isMobile);
  const maxWidth = resolveResponsiveValue(section.maxWidth, isMobile);
  const minHeight = resolveResponsiveValue(section.minHeight, isMobile);
  const maxHeight = resolveResponsiveValue(section.maxHeight, isMobile);
  const selfAlign = resolveResponsiveValue(section.selfAlign, isMobile);
  const marginLeft = resolveResponsiveValue(section.marginLeft, isMobile);
  const marginRight = resolveResponsiveValue(section.marginRight, isMobile);
  const marginTop = resolveResponsiveValue(section.marginTop, isMobile);
  const marginBottom = resolveResponsiveValue(section.marginBottom, isMobile);
  const resolvedMargin = resolveResponsiveValue(section.margin, isMobile);
  const resolvedPadding = resolveResponsiveValue(section.padding, isMobile);
  const resolvedPaddingTop = resolveResponsiveValue(section.paddingTop, isMobile);
  const resolvedPaddingRight = resolveResponsiveValue(section.paddingRight, isMobile);
  const resolvedPaddingBottom = resolveResponsiveValue(section.paddingBottom, isMobile);
  const resolvedPaddingLeft = resolveResponsiveValue(section.paddingLeft, isMobile);
  const sectionGap = resolveResponsiveValue(section.sectionGap, isMobile);
  const resolvedPosition = resolveResponsiveValue(section.position, isMobile);
  const top = resolveResponsiveValue(section.top, isMobile);
  const right = resolveResponsiveValue(section.right, isMobile);
  const bottom = resolveResponsiveValue(section.bottom, isMobile);
  const left = resolveResponsiveValue(section.left, isMobile);
  const inset = resolveResponsiveValue(section.inset, isMobile);
  const initialX = resolveResponsiveValue(section.initialX, isMobile);
  const initialY = resolveResponsiveValue(section.initialY, isMobile);
  const resolvedBorderRadius = resolveResponsiveValue(section.borderRadius, isMobile);
  const resolvedAspectRatio = resolveResponsiveValue(section.aspectRatio, isMobile);
  const resolvedOverflow = resolveResponsiveValue(section.scroll, isMobile);
  const resolvedOverflowX = resolveResponsiveValue(section.scrollX, isMobile);
  const resolvedOverflowY = resolveResponsiveValue(section.scrollY, isMobile);
  const resolvedFill = lowerThemeStringToCss(resolveResponsiveValue(section.fill, isMobile));
  const resolvedBorder = lowerThemeValueDeep(section.border) as typeof section.border;
  const resolvedEffects = lowerThemeValueDeep(section.effects) as typeof section.effects;

  const resolvedWrapperStyle = lowerThemeStyleObject(section.wrapperStyle) as
    | Record<string, unknown>
    | undefined;

  const style = buildSectionBaseStyle({
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    align: selfAlign as "left" | "center" | "right" | "full" | undefined,
    initialX,
    initialY,
    borderRadius: resolvedBorderRadius,
    border: resolvedBorder,
    resolvedOverflow,
    resolvedOverflowX,
    resolvedOverflowY,
    zIndex: section.layer,
    resolvedEffects,
    boxShadow: section.boxShadow,
    filter: section.filter,
    backdropFilter: section.bgBlur,
    clipPath: section.clipShape,
    cursor: section.cursor,
    aspectRatio: resolvedAspectRatio,
    padding: resolvedPadding,
    paddingTop: resolvedPaddingTop,
    paddingRight: resolvedPaddingRight,
    paddingBottom: resolvedPaddingBottom,
    paddingLeft: resolvedPaddingLeft,
    margin: resolvedMargin,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    sectionGap,
    resolvedPosition,
    top,
    right,
    bottom,
    left,
    inset,
    pointerEvents: section.interaction,
    userSelect: section.selectable,
    willChange: section.willChange,
    opacity: section.opacity,
    wrapperStyle: resolvedWrapperStyle,
    resolvedFill,
    layers: section.layers,
  });

  const baseStyle = applySectionFillStyle(resolvedFill, section.layers, style);
  return {
    style: section.colorScheme ? { ...baseStyle, colorScheme: section.colorScheme } : baseStyle,
    resolvedFill,
    resolvedHeight: height,
  };
}
