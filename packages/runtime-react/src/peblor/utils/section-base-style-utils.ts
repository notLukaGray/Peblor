import type { CSSProperties } from "react";
import {
  sectionEffectsToStyle,
  buildTransformString,
  borderToCss,
  getSectionAlignStyle,
} from "@pb/core/layout";

/**
 * Shared section style utility — a pure function that computes the base CSS style
 * object for a section from already-resolved layout values.
 *
 * Used by both:
 * - server-section-style.ts (pure build function at build time)
 * - use-section-base-styles.ts (React hook at runtime)
 *
 * This eliminates the parallel style pipeline between server build and client hooks.
 */

export type ResolvedSectionLayout = {
  width: string | undefined;
  height: string | undefined;
  minWidth: string | undefined;
  maxWidth: string | undefined;
  minHeight: string | undefined;
  maxHeight: string | undefined;
};

export function buildOverflowPair(
  resolvedOverflowX: string | undefined,
  resolvedOverflowY: string | undefined,
  resolvedOverflow: string | undefined
): Pick<CSSProperties, "overflowX" | "overflowY"> {
  if (resolvedOverflowX || resolvedOverflowY) {
    return {
      ...(resolvedOverflowX ? { overflowX: resolvedOverflowX as CSSProperties["overflowX"] } : {}),
      ...(resolvedOverflowY ? { overflowY: resolvedOverflowY as CSSProperties["overflowY"] } : {}),
    };
  }
  if (resolvedOverflow === "visible") return { overflowX: "visible", overflowY: "visible" };
  if (resolvedOverflow === "auto") return { overflowX: "auto", overflowY: "auto" };
  if (resolvedOverflow === "scroll") return { overflowX: "scroll", overflowY: "scroll" };
  return { overflowX: "hidden", overflowY: "hidden" };
}

export function mergeEffectStyles(
  resolvedEffects: unknown,
  boxShadow: string | undefined,
  filter: string | undefined,
  backdropFilter: string | undefined
) {
  const effectStyle = sectionEffectsToStyle(
    resolvedEffects as Parameters<typeof sectionEffectsToStyle>[0]
  ) as Record<string, string | undefined>;
  const mergedBoxShadow = [effectStyle.boxShadow, boxShadow]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(", ");
  const mergedFilter = [effectStyle.filter, filter]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
  const mergedBackdropFilter = [effectStyle.backdropFilter, backdropFilter]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
  return { effectStyle, mergedBoxShadow, mergedFilter, mergedBackdropFilter };
}

export type BuildSectionBaseStyleInput = {
  width: string | undefined;
  height: string | undefined;
  minWidth: string | undefined;
  maxWidth: string | undefined;
  minHeight: string | undefined;
  maxHeight: string | undefined;
  align: "left" | "center" | "right" | "full" | undefined;
  initialX: string | undefined;
  initialY: string | undefined;
  borderRadius: string | undefined;
  border: unknown;
  resolvedOverflow: string | undefined;
  resolvedOverflowX: string | undefined;
  resolvedOverflowY: string | undefined;
  zIndex: number | undefined;
  resolvedEffects: unknown;
  boxShadow: string | undefined;
  filter: string | undefined;
  backdropFilter: string | undefined;
  clipPath: string | undefined;
  cursor: string | undefined;
  aspectRatio: string | undefined;
  padding: string | undefined;
  paddingTop: string | undefined;
  paddingRight: string | undefined;
  paddingBottom: string | undefined;
  paddingLeft: string | undefined;
  margin: string | undefined;
  marginTop: string | undefined;
  marginRight: string | undefined;
  marginBottom: string | undefined;
  marginLeft: string | undefined;
  sectionGap: string | undefined;
  resolvedPosition: string | undefined;
  top: string | undefined;
  right: string | undefined;
  bottom: string | undefined;
  left: string | undefined;
  inset: string | undefined;
  pointerEvents: string | undefined;
  userSelect: string | undefined;
  willChange: string | undefined;
  opacity: number | undefined;
  wrapperStyle: Record<string, unknown> | undefined;
  resolvedFill: string | undefined;
  layers: unknown;
  transform?: string | undefined;
};

/**
 * Pure function to build the base CSSProperties for a section from resolved layout values.
 * Both server-section-style.buildServerSectionBaseStyle and
 * use-section-base-styles.useSectionBaseStyles delegate their core style computation here.
 */
export function buildSectionBaseStyle(input: BuildSectionBaseStyleInput): CSSProperties {
  const {
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    align,
    initialX,
    initialY,
    borderRadius,
    border,
    resolvedOverflow,
    resolvedOverflowX,
    resolvedOverflowY,
    zIndex,
    resolvedEffects,
    boxShadow,
    filter,
    backdropFilter,
    clipPath,
    cursor,
    aspectRatio,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    margin,
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
    pointerEvents,
    userSelect,
    willChange,
    opacity,
    wrapperStyle,
    transform: existingTransform,
  } = input;

  const { effectStyle, mergedBoxShadow, mergedFilter, mergedBackdropFilter } = mergeEffectStyles(
    resolvedEffects,
    boxShadow,
    filter,
    backdropFilter
  );

  const hasInitialPosition = initialX !== undefined || initialY !== undefined;
  const alignStyle = getSectionAlignStyle(align, width);
  const overflowPair = buildOverflowPair(resolvedOverflowX, resolvedOverflowY, resolvedOverflow);

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
    borderRadius,
    border: borderToCss(border as { width?: string; style?: string; color?: string } | undefined),
    ...overflowPair,
    ...(zIndex != null ? { zIndex } : {}),
    ...(!hasInitialPosition || initialX === undefined ? alignStyle : {}),
    ...positioningStyle,
    ...effectStyle,
    ...(mergedBoxShadow ? { boxShadow: mergedBoxShadow } : {}),
    ...(mergedFilter ? { filter: mergedFilter } : {}),
    ...(mergedBackdropFilter
      ? { backdropFilter: mergedBackdropFilter, WebkitBackdropFilter: mergedBackdropFilter }
      : {}),
    ...(clipPath ? { clipPath } : {}),
    ...(cursor ? { cursor } : {}),
    ...(aspectRatio ? { aspectRatio } : {}),
  };

  if (padding != null) style.padding = padding;
  if (paddingTop != null) style.paddingTop = paddingTop;
  if (paddingRight != null) style.paddingRight = paddingRight;
  if (paddingBottom != null) style.paddingBottom = paddingBottom;
  if (paddingLeft != null) style.paddingLeft = paddingLeft;

  if (margin != null) style.margin = margin;
  if (marginTop != null) style.marginTop = marginTop;
  if (marginRight != null) style.marginRight = marginRight;
  if (marginBottom != null) style.marginBottom = marginBottom;
  if (marginLeft != null) style.marginLeft = marginLeft;

  if (sectionGap != null) {
    style.marginBottom = sectionGap;
  } else if (style.marginBottom == null) {
    style.marginBottom = "var(--pb-section-gap, 0px)";
  }

  if (wrapperStyle) {
    Object.assign(style, wrapperStyle);
  }

  if (opacity != null) style.opacity = opacity;
  if (resolvedPosition != null) style.position = resolvedPosition as CSSProperties["position"];
  if (top != null) style.top = top;
  if (right != null) style.right = right;
  if (bottom != null) style.bottom = bottom;
  if (left != null) style.left = left;
  if (inset != null) style.inset = inset;
  if (pointerEvents != null) style.pointerEvents = pointerEvents as CSSProperties["pointerEvents"];
  if (userSelect != null) style.userSelect = userSelect as CSSProperties["userSelect"];
  if (willChange != null) style.willChange = willChange as CSSProperties["willChange"];

  const positioningTransform = positioningStyle.transform as string | undefined;
  const transform = buildTransformString(positioningTransform ?? existingTransform, undefined);
  if (transform) style.transform = transform;

  return style;
}
