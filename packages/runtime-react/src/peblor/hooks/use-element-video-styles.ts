"use client";

import { useMemo } from "react";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import type { CSSProperties } from "react";
import type { ElementLayoutTransformOptions } from "@pb/core/layout";
import { getElementLayoutStyle, getElementTransformStyle } from "@pb/core/layout";
import {
  getElementVideoVideoStyle,
  getElementVideoInnerStyle,
  type ElementVideoObjectFit,
} from "@pb/core/media";
import { globals } from "@pb/runtime-react/core/lib/globals";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeStyleObject } from "@/peblor/theme/theme-string";

/** Layout props may be responsive (tuple). Hook passes through to lib which resolves. */
export type UseElementVideoStylesParams = {
  width?: string | [string, string];
  height?: string | [string, string];
  align?:
    | "left"
    | "center"
    | "right"
    | "full"
    | ["left" | "center" | "right" | "full", "left" | "center" | "right" | "full"];
  alignY?: "top" | "center" | "bottom" | ["top" | "center" | "bottom", "top" | "center" | "bottom"];
  borderRadius?: string | [string, string];
  constraints?:
    | { minWidth?: string; maxWidth?: string; minHeight?: string; maxHeight?: string }
    | [
        { minWidth?: string; maxWidth?: string; minHeight?: string; maxHeight?: string }?,
        { minWidth?: string; maxWidth?: string; minHeight?: string; maxHeight?: string }?,
      ];
  marginTop?: string | [string, string];
  marginBottom?: string | [string, string];
  marginLeft?: string | [string, string];
  marginRight?: string | [string, string];
  zIndex?: number;
  fixed?: boolean;
  wrapperStyle?: CSSProperties;
  opacity?: number;
  blendMode?: string;
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  overflow?: "hidden" | "visible" | "auto" | "scroll";
  hidden?: boolean;
  rotate?: number | string;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  objectFit?: ElementVideoObjectFit | [ElementVideoObjectFit, ElementVideoObjectFit];
  objectPosition?: string;
  aspectRatio?: string | [string, string];
  moduleConfig?: { container?: { padding?: string; borderRadius?: string; aspectRatio?: string } };
};

export type UseElementVideoStylesResult = {
  layoutStyle: CSSProperties;
  innerStyle: CSSProperties;
  videoStyle: CSSProperties;
  figureStyle: CSSProperties;
  wrapperStyle: CSSProperties;
  containerStyle: CSSProperties;
};

export function useElementVideoStyles({
  width,
  height,
  align,
  alignY,
  borderRadius,
  constraints,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex,
  fixed,
  wrapperStyle: layoutWrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  backdropFilter,
  overflow,
  hidden,
  rotate,
  flipHorizontal,
  flipVertical,
  objectFit = "cover",
  objectPosition,
  aspectRatio,
  moduleConfig,
}: UseElementVideoStylesParams): UseElementVideoStylesResult {
  const { isMobile } = useDeviceType();
  const themeMode = usePeblorThemeMode();
  const resolvedLayoutWrapperStyle = resolveThemeStyleObject(
    layoutWrapperStyle as Record<string, unknown> | undefined,
    themeMode
  ) as CSSProperties | undefined;
  const resolvedAspectRatioRaw =
    aspectRatio ??
    (moduleConfig
      ? (moduleConfig?.container?.aspectRatio ?? globals.uiVideoDefaultAspectRatio)
      : undefined);
  const resolvedAspectRatio =
    typeof resolvedAspectRatioRaw === "string"
      ? resolvedAspectRatioRaw
      : resolveResponsiveValue(resolvedAspectRatioRaw, isMobile);

  const layoutStyle = useMemo(
    () =>
      getElementLayoutStyle({
        width,
        height,
        align,
        alignY,
        borderRadius,
        constraints,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        zIndex,
        fixed,
        wrapperStyle: resolvedLayoutWrapperStyle,
        opacity,
        blendMode,
        boxShadow,
        filter,
        backdropFilter,
        overflow,
        hidden,
      } as Parameters<typeof getElementLayoutStyle>[0]),
    [
      width,
      height,
      align,
      alignY,
      borderRadius,
      constraints,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      zIndex,
      fixed,
      resolvedLayoutWrapperStyle,
      opacity,
      blendMode,
      boxShadow,
      filter,
      backdropFilter,
      overflow,
      hidden,
    ]
  );

  const transformBase = useMemo(
    () =>
      getElementTransformStyle({
        width,
        height,
        align,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        rotate,
        flipHorizontal,
        flipVertical,
      } as ElementLayoutTransformOptions),
    [
      width,
      height,
      align,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      rotate,
      flipHorizontal,
      flipVertical,
    ]
  );

  const innerStyle = useMemo(
    () => getElementVideoInnerStyle(transformBase, objectFit),
    [transformBase, objectFit]
  );

  const videoStyle = useMemo(
    () => getElementVideoVideoStyle(objectFit, objectPosition),
    [objectFit, objectPosition]
  );

  const containerStyle = moduleConfig?.container;

  const figureStyle = useMemo(
    (): CSSProperties => ({
      ...layoutStyle,
      aspectRatio: resolvedAspectRatio,
      ...(moduleConfig
        ? {
            height: "auto",
            minHeight: 0,
            boxSizing: "border-box",
            ...(layoutStyle.position == null ? { position: "relative" } : {}),
          }
        : {}),
      ...(containerStyle?.padding ? { padding: containerStyle.padding } : {}),
      ...(containerStyle?.borderRadius ? { borderRadius: containerStyle.borderRadius } : {}),
    }),
    [layoutStyle, resolvedAspectRatio, moduleConfig, containerStyle]
  );

  const wrapperStyle = useMemo(
    (): CSSProperties =>
      moduleConfig
        ? {
            ...innerStyle,
            position: "absolute",
            inset: containerStyle?.padding ?? 0,
            width: "auto",
            height: "auto",
            minWidth: 0,
            minHeight: 0,
            ...(containerStyle?.borderRadius ? { borderRadius: containerStyle.borderRadius } : {}),
            overflow: "hidden",
          }
        : innerStyle,
    [innerStyle, moduleConfig, containerStyle]
  );

  const videoContainerStyle = useMemo(
    (): CSSProperties =>
      resolvedAspectRatio
        ? {
            aspectRatio: resolvedAspectRatio,
            height: "auto",
            minHeight: 0,
          }
        : {},
    [resolvedAspectRatio]
  );

  return {
    layoutStyle,
    innerStyle,
    videoStyle,
    figureStyle,
    wrapperStyle,
    containerStyle: videoContainerStyle,
  };
}
