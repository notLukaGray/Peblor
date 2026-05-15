"use client";

import { useMemo, type CSSProperties } from "react";
import { parseCssValueToPixels, buildTransformString } from "@pb/core/layout";
import { Z_INDEX } from "@pb/core/layout";
import type { ResolvedSectionLayout } from "@/peblor/section/position/use-section-base-styles";

export type UseFixedTraitProps = {
  fixed?: boolean;
  fixedPosition?: "top" | "bottom" | "left" | "right";
  fixedOffset?: string;
  resolvedLayout: ResolvedSectionLayout;
  zIndex?: number;
};

export function useFixedTrait({
  fixed = false,
  fixedPosition = "top",
  fixedOffset = "0px",
  resolvedLayout,
  zIndex,
}: UseFixedTraitProps): CSSProperties {
  return useMemo(() => {
    if (!fixed) return {};

    const w = resolvedLayout.width ?? "100%";
    const h = resolvedLayout.height;
    const a = resolvedLayout.align ?? "left";

    const offsetPixels =
      parseCssValueToPixels(fixedOffset, fixedPosition === "top" || fixedPosition === "bottom") ??
      0;

    const style: CSSProperties = {
      position: "fixed",
      zIndex: zIndex ?? Z_INDEX.FIXED_SECTION,
    };

    let existingTransform: string | undefined;
    switch (fixedPosition) {
      case "top":
        style.top = `${offsetPixels}px`;
        style.left = a === "center" ? "50%" : a === "right" ? "auto" : "0";
        style.right = a === "right" ? "0" : "auto";
        style.width = w === "hug" ? "fit-content" : w || "100%";
        if (a === "center") existingTransform = "translateX(-50%)";
        break;
      case "bottom":
        style.bottom = `${offsetPixels}px`;
        style.left = a === "center" ? "50%" : a === "right" ? "auto" : "0";
        style.right = a === "right" ? "0" : "auto";
        style.width = w === "hug" ? "fit-content" : w || "100%";
        if (a === "center") existingTransform = "translateX(-50%)";
        break;
      case "left":
        style.left = `${offsetPixels}px`;
        style.top = "50%";
        existingTransform = "translateY(-50%)";
        style.height = h === "hug" ? "fit-content" : h || "auto";
        break;
      case "right":
        style.right = `${offsetPixels}px`;
        style.top = "50%";
        existingTransform = "translateY(-50%)";
        style.height = h === "hug" ? "fit-content" : h || "auto";
        break;
    }

    const transform = buildTransformString(existingTransform);
    if (transform) style.transform = transform;

    return style;
  }, [
    fixed,
    fixedPosition,
    fixedOffset,
    resolvedLayout.width,
    resolvedLayout.height,
    resolvedLayout.align,
    zIndex,
  ]);
}
