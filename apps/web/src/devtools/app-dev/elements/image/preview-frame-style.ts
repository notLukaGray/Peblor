import type { CSSProperties } from "react";
import type { PreviewResolvedVariant } from "./preview-motion-types";

function buildTransform(variant: PreviewResolvedVariant): string | undefined {
  const rotate =
    typeof variant.rotate === "number" ? `rotate(${variant.rotate}deg)` : variant.rotate;
  const flips = [
    variant.flipHorizontal ? "scaleX(-1)" : "",
    variant.flipVertical ? "scaleY(-1)" : "",
  ];
  const transform = [rotate ?? "", ...flips].filter(Boolean).join(" ");
  return transform.length > 0 ? transform : undefined;
}

export function getPreviewUploadImageStyle(variant: PreviewResolvedVariant): CSSProperties {
  if (variant.objectFit === "fillWidth") return { width: "100%", height: "auto", maxWidth: "100%" };
  if (variant.objectFit === "fillHeight")
    return { width: "auto", height: "100%", maxHeight: "100%" };
  if (variant.objectFit === "crop") {
    const { x, y, scale } = variant.imageCrop ?? { x: 0, y: 0, scale: 1 };
    const boundedScale = Math.min(4, Math.max(1, scale));
    return {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "50% 50%",
      transform: `translate(${x}%, ${y}%) scale(${boundedScale})`,
      transformOrigin: "center center",
    };
  }
  return {
    width: "100%",
    height: "100%",
    objectFit: variant.objectFit === "contain" ? "contain" : "cover",
    objectPosition: variant.objectPosition ?? "50% 50%",
  };
}

export function getPreviewFrameStyle(
  variant: PreviewResolvedVariant,
  variantLayoutStyle?: CSSProperties
): CSSProperties {
  return {
    ...variantLayoutStyle,
    ...(variant.zIndex != null ? { zIndex: variant.zIndex } : {}),
    borderRadius: variant.borderRadius,
    overflow: variant.overflow ?? "hidden",
    opacity: variant.opacity ?? 1,
    mixBlendMode: variant.blendMode as CSSProperties["mixBlendMode"],
    boxShadow: variant.boxShadow,
    filter: variant.filter,
    backdropFilter: variant.backdropFilter,
    transform: buildTransform(variant),
    visibility: variant.hidden ? "hidden" : "visible",
  };
}
