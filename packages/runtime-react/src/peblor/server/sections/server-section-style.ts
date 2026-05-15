import type { CSSProperties } from "react";
import type { BaseSectionProps } from "@pb/contracts/types";
import {
  applySectionFillStyle,
  borderToCss,
  buildTransformString,
  getSectionAlignStyle,
  sectionEffectsToStyle,
} from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { resolveThemeString, resolveThemeValueDeep } from "../../theme/theme-string";

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
    | "align"
    | "marginLeft"
    | "marginRight"
    | "marginTop"
    | "marginBottom"
    | "borderRadius"
    | "border"
    | "boxShadow"
    | "filter"
    | "backdropFilter"
    | "clipPath"
    | "cursor"
    | "aspectRatio"
    | "initialX"
    | "initialY"
    | "zIndex"
    | "overflow"
  >,
  serverIsMobile: boolean | undefined,
  usePadding: boolean
): ServerSectionBaseStyleResult {
  const isMobile = serverIsMobile ?? false;
  const width = resolveResponsiveValue(section.width, isMobile);
  const height = resolveResponsiveValue(section.height, isMobile);
  const minWidth = resolveResponsiveValue(section.minWidth, isMobile);
  const maxWidth = resolveResponsiveValue(section.maxWidth, isMobile);
  const minHeight = resolveResponsiveValue(section.minHeight, isMobile);
  const maxHeight = resolveResponsiveValue(section.maxHeight, isMobile);
  const align = resolveResponsiveValue(section.align, isMobile);
  const marginLeft = resolveResponsiveValue(section.marginLeft, isMobile);
  const marginRight = resolveResponsiveValue(section.marginRight, isMobile);
  const marginTop = resolveResponsiveValue(section.marginTop, isMobile);
  const marginBottom = resolveResponsiveValue(section.marginBottom, isMobile);
  const initialX = resolveResponsiveValue(section.initialX, isMobile);
  const initialY = resolveResponsiveValue(section.initialY, isMobile);
  const resolvedBorderRadius = resolveResponsiveValue(section.borderRadius, isMobile);
  const resolvedAspectRatio = resolveResponsiveValue(section.aspectRatio, isMobile);
  const resolvedOverflow = resolveResponsiveValue(section.overflow, isMobile);
  const resolvedFill = resolveThemeString(resolveResponsiveValue(section.fill, isMobile), "light");
  const resolvedBorder = resolveThemeValueDeep(section.border, "light") as typeof section.border;
  const resolvedEffects = resolveThemeValueDeep(section.effects, "light") as typeof section.effects;
  const effectStyle = sectionEffectsToStyle(resolvedEffects);
  const mergedBoxShadow = [effectStyle.boxShadow, section.boxShadow]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(", ");
  const mergedFilter = [effectStyle.filter, section.filter]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
  const mergedBackdropFilter = [effectStyle.backdropFilter, section.backdropFilter]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
  const overflowPair: Pick<CSSProperties, "overflowX" | "overflowY"> =
    resolvedOverflow === "visible"
      ? { overflowX: "visible", overflowY: "visible" }
      : resolvedOverflow === "auto"
        ? { overflowX: "auto", overflowY: "auto" }
        : resolvedOverflow === "scroll"
          ? { overflowX: "scroll", overflowY: "scroll" }
          : { overflowX: "hidden", overflowY: "hidden" };
  const hasInitialPosition = initialX !== undefined || initialY !== undefined;
  const alignStyle = getSectionAlignStyle(align, width);
  const positioningStyle: CSSProperties = hasInitialPosition
    ? {
        position: "absolute",
        ...(initialX !== undefined
          ? { left: initialX }
          : align === "center"
            ? { left: "50%", transform: "translateX(-50%)" }
            : align === "right"
              ? { right: 0 }
              : { left: 0 }),
        top: initialY ?? 0,
      }
    : {};
  const style: CSSProperties = {
    width: width === "hug" ? "fit-content" : width,
    height: height === "hug" ? "fit-content" : height,
    ...(minWidth != null ? { minWidth } : {}),
    ...(maxWidth != null ? { maxWidth } : {}),
    ...(minHeight != null ? { minHeight } : {}),
    ...(maxHeight != null ? { maxHeight } : {}),
    borderRadius: resolvedBorderRadius,
    border: borderToCss(resolvedBorder as { width?: string; style?: string; color?: string }),
    ...overflowPair,
    scrollBehavior: "smooth",
    ...(section.zIndex != null ? { zIndex: section.zIndex } : {}),
    ...(!hasInitialPosition || initialX === undefined ? alignStyle : {}),
    ...positioningStyle,
    ...effectStyle,
    ...(mergedBoxShadow ? { boxShadow: mergedBoxShadow } : {}),
    ...(mergedFilter ? { filter: mergedFilter } : {}),
    ...(mergedBackdropFilter
      ? { backdropFilter: mergedBackdropFilter, WebkitBackdropFilter: mergedBackdropFilter }
      : {}),
    ...(section.clipPath ? { clipPath: section.clipPath } : {}),
    ...(section.cursor ? { cursor: section.cursor } : {}),
    ...(resolvedAspectRatio ? { aspectRatio: resolvedAspectRatio } : {}),
  };

  if (usePadding) {
    style.paddingLeft = marginLeft;
    style.paddingRight = marginRight;
    style.paddingTop = marginTop;
    style.paddingBottom = marginBottom;
  } else {
    style.marginLeft = marginLeft;
    style.marginRight = marginRight;
    style.marginTop = marginTop;
    style.marginBottom = marginBottom;
  }

  const existingTransform = positioningStyle.transform as string | undefined;
  const transform = buildTransformString(existingTransform, undefined);
  if (transform) style.transform = transform;

  return {
    style: applySectionFillStyle(resolvedFill, section.layers, style),
    resolvedFill,
    resolvedHeight: height,
  };
}
