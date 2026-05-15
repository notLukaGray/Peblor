"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { getSectionAlignStyle } from "@pb/core/layout";
import type { SectionAlign } from "@pb/core/layout";

type UseSectionPositioningProps = {
  align?: SectionAlign;
  width?: string;
  initialX?: string;
  initialY?: string;
};

/** Align and absolute positioning styles for sections. */
export function useSectionPositioning({
  align,
  width,
  initialX,
  initialY,
}: UseSectionPositioningProps) {
  const alignStyle = useMemo(() => getSectionAlignStyle(align, width), [align, width]);

  const hasInitialPosition = initialX !== undefined || initialY !== undefined;

  const positioningStyle = useMemo<CSSProperties>(() => {
    if (!hasInitialPosition) return {};

    const style: CSSProperties = {
      position: "absolute",
    };

    if (initialX !== undefined) {
      style.left = initialX;
    } else {
      if (align === "center") {
        style.left = "50%";
        style.transform = "translateX(-50%)";
      } else if (align === "right") {
        style.right = "0";
      } else {
        style.left = "0";
      }
    }

    if (initialY !== undefined) {
      style.top = initialY;
    } else {
      style.top = "0";
    }

    return style;
  }, [hasInitialPosition, initialX, initialY, align]);

  return {
    alignStyle,
    positioningStyle,
    hasInitialPosition,
    shouldApplyAlignStyle: !hasInitialPosition || initialX === undefined,
  };
}
