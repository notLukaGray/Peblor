import type {
  PbImageAnimationFineTune,
  PbImageVariantDefaults,
} from "@/app/theme/pb-builder-defaults";
import {
  resolveConstraintsForDevice,
  resolveResponsiveValueForDevice,
  type PreviewDevice,
} from "@/app/dev/elements/image/responsive";
import { isNonEmptyText } from "@/app/dev/elements/image/utils";

function hasResponsiveText(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (!Array.isArray(value) || value.length !== 2) return false;
  return value.some((entry) => typeof entry === "string" && entry.trim().length > 0);
}

function hasAnyText(values: Array<string | undefined>): boolean {
  return values.some((value) => isNonEmptyText(value));
}

function hasLayoutModeAlignment(layoutMode: PbImageVariantDefaults["layoutMode"]): boolean {
  return layoutMode === "fill" || layoutMode === "constraints";
}

function toConstraintTextValues(constraints: ReturnType<typeof resolveConstraintsForDevice>) {
  if (!constraints) return [undefined, undefined, undefined, undefined] as const;
  return [
    constraints.minWidth,
    constraints.maxWidth,
    constraints.minHeight,
    constraints.maxHeight,
  ] as const;
}

export function resolveObjectFitControls(
  variant: PbImageVariantDefaults,
  previewDevice: PreviewDevice
): {
  activeObjectFitForPreview: "cover" | "contain" | "fillWidth" | "fillHeight" | "crop";
  showObjectPositionControl: boolean;
  showCropPanZoom: boolean;
} {
  const activeObjectFitForPreview =
    resolveResponsiveValueForDevice(variant.objectFit, previewDevice) ?? "cover";
  return {
    activeObjectFitForPreview,
    showObjectPositionControl:
      activeObjectFitForPreview !== "crop" &&
      (activeObjectFitForPreview === "cover" || activeObjectFitForPreview === "contain"),
    showCropPanZoom: activeObjectFitForPreview === "crop",
  };
}

export function resolveShowAlignmentControls(variant: PbImageVariantDefaults): boolean {
  if (hasLayoutModeAlignment(variant.layoutMode)) return true;
  if (hasResponsiveText(variant.width) || hasResponsiveText(variant.height)) return true;

  const constraintsDesktop = toConstraintTextValues(
    resolveConstraintsForDevice(variant.constraints, "desktop")
  );
  const constraintsMobile = toConstraintTextValues(
    resolveConstraintsForDevice(variant.constraints, "mobile")
  );

  return hasAnyText([
    resolveResponsiveValueForDevice(variant.width, "desktop"),
    resolveResponsiveValueForDevice(variant.width, "mobile"),
    resolveResponsiveValueForDevice(variant.height, "desktop"),
    resolveResponsiveValueForDevice(variant.height, "mobile"),
    ...constraintsDesktop,
    ...constraintsMobile,
  ]);
}

export function resolveAnimationControlVisibility(fineTune: PbImageAnimationFineTune): {
  showHybridControls: boolean;
  showFineTuneControls: boolean;
  showPresetControls: boolean;
} {
  const showHybridControls =
    fineTune.entranceBehavior === "hybrid" || fineTune.exitBehavior === "hybrid";
  const showFineTuneControls =
    fineTune.entranceBehavior === "custom" || fineTune.exitBehavior === "custom";
  return {
    showHybridControls,
    showFineTuneControls,
    showPresetControls: !showFineTuneControls,
  };
}
