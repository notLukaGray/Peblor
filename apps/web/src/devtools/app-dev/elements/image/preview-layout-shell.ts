import type { CSSProperties } from "react";
import type { PreviewMediaShell, PreviewResolvedVariant } from "./preview-motion-types";

const FRAME_BASE_CLASS = "absolute inset-6 flex md:inset-8";

function buildStageStyle(variant: PreviewResolvedVariant): CSSProperties {
  const justifyContent =
    variant.align === "left" ? "flex-start" : variant.align === "right" ? "flex-end" : "center";
  const alignItems =
    variant.alignY === "top" ? "flex-start" : variant.alignY === "bottom" ? "flex-end" : "center";
  return { justifyContent, alignItems };
}

function buildFillShell(
  variant: PreviewResolvedVariant,
  stageStyle: CSSProperties
): PreviewMediaShell {
  const isFullBleed =
    (variant.width == null || variant.width === "100%") &&
    (variant.height == null || variant.height === "100%");

  if (isFullBleed) {
    return {
      className: "absolute inset-0 flex",
      style: stageStyle,
      mediaStyle: { width: "100%", height: "100%" },
      slotClassName: "relative shrink-0 w-full h-full min-w-0 min-h-0",
      slotStyle: {},
      innerClassName: "w-full h-full min-w-0 min-h-0",
      innerStyle: {},
    };
  }

  return {
    className: FRAME_BASE_CLASS,
    style: stageStyle,
    mediaStyle: { width: "100%", height: "100%" },
    slotClassName: "relative shrink-0 min-w-0 min-h-0",
    slotStyle: {
      width: variant.width ?? "70%",
      height: variant.height ?? "70%",
      maxWidth: "100%",
      maxHeight: "100%",
    },
    innerClassName:
      "w-full h-full min-w-0 min-h-0 flex flex-col [&>*]:flex-1 [&>*]:min-h-0 [&>*]:flex [&>*]:flex-col [&>*>*]:flex-1 [&>*>*]:min-h-0",
    innerStyle: {},
  };
}

function buildConstraintsShell(
  variant: PreviewResolvedVariant,
  stageStyle: CSSProperties
): PreviewMediaShell {
  return {
    className: FRAME_BASE_CLASS,
    style: stageStyle,
    mediaStyle: {
      width: variant.width ?? "70%",
      height: variant.height,
    },
    slotClassName: "relative shrink-0 min-w-0 min-h-0",
    slotStyle: {},
    innerClassName: "min-w-0 min-h-0",
    innerStyle: {},
  };
}

function buildAspectRatioShell(
  variant: PreviewResolvedVariant,
  stageStyle: CSSProperties
): PreviewMediaShell {
  return {
    className: FRAME_BASE_CLASS,
    style: stageStyle,
    mediaStyle: { width: "100%" },
    slotClassName: "relative shrink-0 h-full min-w-0 min-h-0",
    slotStyle: {
      aspectRatio: variant.aspectRatio ?? "16 / 9",
      maxWidth: "100%",
    },
    innerClassName: "w-full h-full min-w-0 min-h-0",
    innerStyle: {},
  };
}

function getFillSummary(variant: PreviewResolvedVariant): string {
  const width = variant.width ?? "100%";
  const height = variant.height ?? "100%";
  const fullBleed =
    (width === "100%" || variant.width == null) && (height === "100%" || variant.height == null);
  return fullBleed
    ? "Fill — edge-to-edge cover inside the stage."
    : `Fill — slot sized to ${width} × ${height}, centred in stage by align / alignY.`;
}

function constraintValue(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

function cropAxis(value: number | undefined): number {
  return value ?? 0;
}

function cropScale(value: number | undefined): number {
  return value ?? 1;
}

function cropFocalSummary(crop: PreviewResolvedVariant["imageCrop"]): string {
  if (crop?.focalX == null || crop?.focalY == null) return "";
  const x = (crop.focalX * 100).toFixed(0);
  const y = (crop.focalY * 100).toFixed(0);
  return ` · focal ${x}%, ${y}% (metadata)`;
}

function getConstraintsSummary(variant: PreviewResolvedVariant): string {
  const constraints = variant.constraints;
  const minWidth = constraintValue(constraints?.minWidth, "12rem");
  const maxWidth = constraintValue(constraints?.maxWidth, "100%");
  const minHeight = constraintValue(constraints?.minHeight, "8rem");
  const maxHeight = constraintValue(constraints?.maxHeight, "100%");
  return `Constraints honor min/max bounds (${minWidth} to ${maxWidth}, ${minHeight} to ${maxHeight}).`;
}

function getCropSummary(variant: PreviewResolvedVariant): string {
  const crop = variant.imageCrop;
  const focal = cropFocalSummary(crop);
  const x = cropAxis(crop?.x);
  const y = cropAxis(crop?.y);
  const scale = cropScale(crop?.scale);
  return `Object fit crop: fixed frame ${variant.aspectRatio ?? "16 / 9"}; left-drag pan · right-drag scale · middle-click focal point (does not pan)${focal} — pan x ${
    x
  }%, y ${y}%, scale ${scale}.`;
}

export function getPreviewMediaShell(variant: PreviewResolvedVariant): PreviewMediaShell {
  const stageStyle = buildStageStyle(variant);
  if (variant.layoutMode === "fill") return buildFillShell(variant, stageStyle);
  if (variant.layoutMode === "constraints") return buildConstraintsShell(variant, stageStyle);
  return buildAspectRatioShell(variant, stageStyle);
}

export function getPreviewLayoutSummary(variant: PreviewResolvedVariant): string {
  if (variant.layoutMode === "fill") return getFillSummary(variant);
  if (variant.layoutMode === "constraints") return getConstraintsSummary(variant);
  if (variant.objectFit === "crop") return getCropSummary(variant);
  return `Aspect ratio mode fits ${variant.aspectRatio ?? "16 / 9"} inside the frame.`;
}
