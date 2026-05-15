import { type PbImageVariantDefaults } from "@/app/theme/pb-builder-defaults";
import {
  resolveConstraintsForDevice,
  resolveResponsiveValueForDevice,
  type PreviewDevice,
} from "@/app/dev/elements/image/responsive";
import type { PreviewResolvedVariant } from "./preview-motion-types";

function asNonEmptyText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeConstraints(
  constraints: ReturnType<typeof resolveConstraintsForDevice>
): PreviewResolvedVariant["constraints"] {
  if (!constraints) return undefined;
  const next = {
    minWidth: asNonEmptyText(constraints.minWidth),
    maxWidth: asNonEmptyText(constraints.maxWidth),
    minHeight: asNonEmptyText(constraints.minHeight),
    maxHeight: asNonEmptyText(constraints.maxHeight),
  };
  return Object.values(next).some((value) => value != null) ? next : undefined;
}

export function resolveVariantForPreview(
  variant: PbImageVariantDefaults,
  device: PreviewDevice
): PreviewResolvedVariant {
  return {
    layoutMode: variant.layoutMode,
    objectFit: resolveResponsiveValueForDevice(variant.objectFit, device) ?? "cover",
    aspectRatio: asNonEmptyText(resolveResponsiveValueForDevice(variant.aspectRatio, device)),
    width: asNonEmptyText(resolveResponsiveValueForDevice(variant.width, device)),
    height: asNonEmptyText(resolveResponsiveValueForDevice(variant.height, device)),
    constraints: sanitizeConstraints(resolveConstraintsForDevice(variant.constraints, device)),
    borderRadius:
      asNonEmptyText(resolveResponsiveValueForDevice(variant.borderRadius, device)) ?? "0",
    objectPosition: asNonEmptyText(variant.objectPosition),
    imageCrop: variant.imageCrop,
    align: resolveResponsiveValueForDevice(variant.align, device),
    alignY: resolveResponsiveValueForDevice(variant.alignY, device),
    marginTop: asNonEmptyText(resolveResponsiveValueForDevice(variant.marginTop, device)),
    marginBottom: asNonEmptyText(resolveResponsiveValueForDevice(variant.marginBottom, device)),
    marginLeft: asNonEmptyText(resolveResponsiveValueForDevice(variant.marginLeft, device)),
    marginRight: asNonEmptyText(resolveResponsiveValueForDevice(variant.marginRight, device)),
    zIndex: variant.zIndex,
    rotate: variant.rotate,
    flipHorizontal: variant.flipHorizontal,
    flipVertical: variant.flipVertical,
    opacity: variant.opacity,
    blendMode: variant.blendMode,
    boxShadow: variant.boxShadow,
    filter: variant.filter,
    backdropFilter: variant.backdropFilter,
    overflow: variant.overflow,
    hidden: variant.hidden,
    animation: variant.animation,
  };
}

export { buildPreviewMotion, getLoopIntervalMs } from "./preview-motion-builders";
export { getPreviewMediaShell, getPreviewLayoutSummary } from "./preview-layout-shell";
export { getPreviewUploadImageStyle, getPreviewFrameStyle } from "./preview-frame-style";
export type { PreviewResolvedVariant, PreviewMediaShell } from "./preview-motion-types";
