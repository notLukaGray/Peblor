import type { CSSProperties } from "react";
import type {
  InfiniteScrollContainerStyleOptions,
  InfiniteScrollItemStyleOptions,
  InfiniteScrollRootStyleOptions,
  InfiniteScrollTrackStyleOptions,
} from "./infinite-scroll-types";

export function buildRootStyle({
  effectiveBorderRadius,
  hasVisualOverlay,
  layoutStyle,
  wrapperStyle,
}: InfiniteScrollRootStyleOptions): CSSProperties {
  const rootStyleBase: CSSProperties = {
    ...layoutStyle,
    borderRadius: effectiveBorderRadius,
    display: "flex",
    overflow: "hidden",
    ...(wrapperStyle as CSSProperties),
  };

  return hasVisualOverlay && rootStyleBase.position == null
    ? { ...rootStyleBase, position: "relative" }
    : rootStyleBase;
}

export function buildContainerStyle({ axis }: InfiniteScrollContainerStyleOptions): CSSProperties {
  const isHorizontal = axis === "horizontal";
  return {
    width: "100%",
    height: "100%",
    // In flex layouts, `min-height: auto` / `min-width: auto` sizes this box to the full track;
    // the host then grows and `scrollHeight` never exceeds `clientHeight`. Zero mins allow the
    // parent chain to cap height/width so overflow scrolling can occur.
    minHeight: 0,
    minWidth: 0,
    overflowX: isHorizontal ? "auto" : "hidden",
    overflowY: isHorizontal ? "hidden" : "auto",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    WebkitTapHighlightColor: "transparent",
    scrollBehavior: "auto",
    // `proximity` keeps snap assistance without fighting wheel deltas the way `mandatory` can.
    scrollSnapType: isHorizontal ? "x proximity" : "y proximity",
    cursor: "default",
    userSelect: "none",
    touchAction: isHorizontal ? "pan-x" : "pan-y",
    overscrollBehavior: "contain",
  };
}

export function buildTrackStyle({
  alignItems,
  axis,
  columnGap,
  framePaddingFallback,
  gap,
  justifyContent,
  padding,
  paddingBottom,
  paddingLeft,
  paddingRight,
  paddingTop,
  rowGap,
}: InfiniteScrollTrackStyleOptions): CSSProperties {
  return {
    display: "flex",
    flexDirection: axis === "horizontal" ? "row" : "column",
    alignItems,
    justifyContent,
    ...(gap != null ? { gap } : {}),
    ...(rowGap != null ? { rowGap } : {}),
    ...(columnGap != null ? { columnGap } : {}),
    ...(padding != null ? { padding } : {}),
    ...(paddingTop != null ? { paddingTop } : {}),
    ...(paddingRight != null ? { paddingRight } : {}),
    ...(paddingBottom != null ? { paddingBottom } : {}),
    ...(paddingLeft != null ? { paddingLeft } : {}),
    ...framePaddingFallback,
    minWidth: axis === "horizontal" ? "max-content" : "100%",
    minHeight: axis === "vertical" ? "max-content" : "100%",
  };
}

export function buildItemStyle({
  activeItemStyle,
  axis,
  centerOnClick,
  inactiveItemStyle,
  isActive,
  isMoving,
  isSelectable,
  opacity,
  prefersReducedMotion,
  scale,
  snapAlign,
  snapDurationMs,
  stretchCrossAxis,
}: InfiniteScrollItemStyleOptions): CSSProperties {
  return {
    flex: "0 0 auto",
    width: axis === "vertical" && stretchCrossAxis ? "100%" : undefined,
    scrollSnapAlign: snapAlign,
    scrollSnapStop: "normal",
    transition: prefersReducedMotion
      ? undefined
      : isMoving
        ? "transform 140ms ease-out, opacity 140ms ease-out"
        : `transform ${snapDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${snapDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
    transform: `scale(${scale})`,
    opacity,
    cursor: centerOnClick && !isActive && isSelectable ? "pointer" : "default",
    ...(isActive ? activeItemStyle : inactiveItemStyle),
  };
}
