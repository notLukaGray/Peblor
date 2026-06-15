"use client";

import { useMemo, type CSSProperties } from "react";
import { buildTransformString } from "@pb/core/layout";
import { useStickyPositioning } from "@/peblor/section/position/use-sticky-positioning";
import type { ResolvedSectionLayout } from "@/peblor/section/position/use-section-base-styles";

export type UseStickyTraitProps = {
  sectionRef: React.RefObject<HTMLElement | null>;
  placeholderRef: React.RefObject<HTMLDivElement | null>;
  sticky?: boolean;
  stickyOffset?: string;
  stickyPosition?: "top" | "bottom";
  hasInitialPosition: boolean;
  resolvedLayout: ResolvedSectionLayout;
  alignStyle: CSSProperties;
};

export function useStickyTrait({
  sectionRef,
  placeholderRef,
  sticky = false,
  stickyOffset = "0px",
  stickyPosition = "top",
  hasInitialPosition,
  resolvedLayout,
  alignStyle,
}: UseStickyTraitProps) {
  const { isSticky, stickyOffsetPixels } = useStickyPositioning({
    sectionRef,
    placeholderRef,
    stickyOffset: sticky ? stickyOffset : undefined,
    stickyPosition,
    hasInitialPosition,
  });

  const styleOverrides = useMemo<CSSProperties>(() => {
    if (!sticky || !isSticky || hasInitialPosition) return {};

    const { selfAlign, width } = resolvedLayout;
    const a = selfAlign ?? "left";
    const w = width ?? "100%";

    const existingTransform = a === "center" ? "translateX(-50%)" : undefined;
    const transform = buildTransformString(existingTransform);

    const overrides: CSSProperties = {
      position: "fixed",
      ...(stickyPosition === "bottom"
        ? { bottom: `${stickyOffsetPixels}px` }
        : { top: `${stickyOffsetPixels}px` }),
      left: a === "center" ? "50%" : a === "right" ? "auto" : "0",
      right: a === "right" ? "0" : "auto",
      width: w === "hug" ? "fit-content" : w,
    };
    if (transform) {
      overrides.transform = transform;
    }
    return overrides;
  }, [sticky, isSticky, hasInitialPosition, resolvedLayout, stickyOffsetPixels, stickyPosition]);

  const placeholderStyle = useMemo<CSSProperties>(() => {
    if (!sticky) return {};
    const { width, height, marginLeft, marginRight, marginTop, marginBottom } = resolvedLayout;
    return {
      width: width === "hug" ? "fit-content" : width,
      height: height === "hug" ? "fit-content" : height,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
      ...alignStyle,
    };
  }, [sticky, resolvedLayout, alignStyle]);

  const showPlaceholder = sticky && !isSticky && !hasInitialPosition;

  return {
    isSticky: sticky && isSticky,
    styleOverrides,
    placeholderStyle,
    showPlaceholder,
  };
}
