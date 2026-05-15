import type { CSSProperties } from "react";
import {
  buildImageMotionTimingFromAnimationDefaults,
  type PbImageAnimationDefaults,
  type PbImageVariantDefaults,
  type PbImageVariantKey,
} from "@/app/theme/pb-builder-defaults";
import type { ElementBlock, MotionPropsFromJson, MotionTiming } from "@pb/contracts";
import type { JsonValue } from "@pb/contracts";
import { resolveEntranceMotion } from "@pb/runtime-react/dev-core";
import { PREVIEW_FALLBACK_IMAGE_SRC } from "@/app/dev/elements/image/constants";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { PreviewDevice } from "@/app/dev/elements/image/responsive";
import type { PreviewFidelityMode } from "@/app/dev/workbench/preview-fidelity";
import { resolveResponsiveValueForDevice } from "@/app/dev/elements/image/responsive";
import { buildRuntimePreviewState, parseLooseValue } from "./runtime-draft-core";

function nonemptyResponsiveDimension(
  value: PbImageVariantDefaults["width"] | PbImageVariantDefaults["height"] | undefined,
  device: PreviewDevice
): boolean {
  const resolved = resolveResponsiveValueForDevice(value, device);
  return resolved != null && String(resolved).trim() !== "";
}

function toUsableLayoutDimensionToken(value: unknown): string | undefined {
  if (value == null) return undefined;
  const token = String(value).trim();
  if (token.length === 0 || token === "auto") return undefined;
  return token;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) out[key] = entry;
  }
  return out as Partial<T>;
}

function buildVisibleWhen(draft: ImageRuntimeDraft) {
  if (!draft.visibleWhenEnabled || !draft.visibleWhenVariable.trim()) return undefined;
  return {
    variable: draft.visibleWhenVariable.trim(),
    operator: draft.visibleWhenOperator,
    value: parseLooseValue(draft.visibleWhenValue) as JsonValue,
  };
}

function parseRuntimeMotion(
  motion: Record<string, unknown> | undefined
): MotionPropsFromJson | undefined {
  if (!motion || typeof motion !== "object" || Object.keys(motion).length === 0) return undefined;
  return motion as MotionPropsFromJson;
}

function buildRuntimeDecorators(draft: ImageRuntimeDraft) {
  const runtime = buildRuntimePreviewState(draft);
  return {
    runtime,
    visibleWhen: buildVisibleWhen(draft),
    interactions: runtime.cursor ? { cursor: runtime.cursor } : undefined,
    aria: runtime.ariaLabel ? { "aria-label": runtime.ariaLabel } : undefined,
    link: runtime.linkHref ? { ref: runtime.linkHref, external: runtime.linkExternal } : undefined,
    motion: parseRuntimeMotion(runtime.motion),
  };
}

function buildMotionTiming(
  animation: PbImageAnimationDefaults,
  runtimeMotion: Record<string, unknown> | undefined,
  mode: Extract<PreviewFidelityMode, "raw" | "guided">
): MotionTiming {
  const rawTiming = buildImageMotionTimingFromAnimationDefaults(animation);
  const motionTimingRecord: Record<string, unknown> =
    mode === "guided" ? { ...rawTiming, trigger: "onMount" } : { ...rawTiming };
  const resolvedEntrance = resolveEntranceMotion(motionTimingRecord, runtimeMotion);
  return (
    resolvedEntrance
      ? { ...motionTimingRecord, resolvedEntranceMotion: resolvedEntrance }
      : motionTimingRecord
  ) as MotionTiming;
}

function resolveDimension(
  responsiveValue: PbImageVariantDefaults["width"] | PbImageVariantDefaults["height"] | undefined,
  fallbackMediaValue: unknown,
  device: PreviewDevice
): PbImageVariantDefaults["width"] | PbImageVariantDefaults["height"] | undefined {
  if (nonemptyResponsiveDimension(responsiveValue, device)) return responsiveValue;
  const fallback = toUsableLayoutDimensionToken(fallbackMediaValue);
  return fallback
    ? (fallback as PbImageVariantDefaults["width"] | PbImageVariantDefaults["height"])
    : responsiveValue;
}

function resolvePreviewDimensions(
  variant: PbImageVariantDefaults,
  slot: { device: PreviewDevice; mediaStyle: CSSProperties } | undefined
): {
  width: PbImageVariantDefaults["width"];
  height: PbImageVariantDefaults["height"];
} {
  const width = slot
    ? resolveDimension(variant.width, slot.mediaStyle.width, slot.device)
    : variant.width;
  const height = slot
    ? resolveDimension(variant.height, slot.mediaStyle.height, slot.device)
    : variant.height;
  if (variant.layoutMode === "fill") {
    return {
      width: "100%" as PbImageVariantDefaults["width"],
      height: "100%" as PbImageVariantDefaults["height"],
    };
  }
  return {
    width: width as PbImageVariantDefaults["width"],
    height: height as PbImageVariantDefaults["height"],
  };
}

function resolvePreviewSrc(
  previewSrc: string | null | undefined,
  allowFallbackSrc: boolean
): string {
  if (previewSrc != null && String(previewSrc).trim() !== "") return previewSrc;
  return allowFallbackSrc ? PREVIEW_FALLBACK_IMAGE_SRC : "";
}

function resolvePreviewAlt(previewAlt: string | null | undefined): string {
  if (previewAlt != null && previewAlt.trim() !== "") return previewAlt;
  return "Image preview";
}

/**
 * Fully-typed `elementImage` block for dev preview: matches export JSON shape but resolves
 * `motionTiming.resolvedEntranceMotion` like the server pipeline so `ElementEntranceWrapper` runs.
 */
export function buildImageDevPreviewElementBlock(
  variantKey: PbImageVariantKey,
  variant: PbImageVariantDefaults,
  draft: ImageRuntimeDraft,
  options?: {
    previewSrc?: string | null;
    previewAlt?: string | null;
    previewLayoutSlot?: { device: PreviewDevice; mediaStyle: CSSProperties };
    mode?: Extract<PreviewFidelityMode, "raw" | "guided">;
    allowFallbackSrc?: boolean;
  }
): Extract<ElementBlock, { type: "elementImage" }> {
  const mode = options?.mode ?? "raw";
  const decorators = buildRuntimeDecorators(draft);

  const motionTiming = buildMotionTiming(
    variant.animation,
    decorators.runtime.motion as Record<string, unknown> | undefined,
    mode
  );
  const { width, height } = resolvePreviewDimensions(variant, options?.previewLayoutSlot);

  const element = omitUndefined({
    type: "elementImage" as const,
    variant: variantKey,
    src: resolvePreviewSrc(options?.previewSrc, options?.allowFallbackSrc ?? mode === "guided"),
    alt: resolvePreviewAlt(options?.previewAlt),
    objectFit: variant.objectFit,
    objectPosition: variant.objectPosition,
    imageCrop: variant.imageCrop,
    aspectRatio: variant.aspectRatio,
    width,
    height,
    constraints: variant.constraints,
    borderRadius: variant.borderRadius,
    align: undefined,
    alignY: undefined,
    marginTop: variant.marginTop,
    marginBottom: variant.marginBottom,
    marginLeft: variant.marginLeft,
    marginRight: variant.marginRight,
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
    priority: variant.priority,
    motionTiming,
    link: decorators.link,
    interactions: decorators.interactions,
    visibleWhen: decorators.visibleWhen,
    aria: decorators.aria,
    wrapperStyle: decorators.runtime.wrapperStyle,
    figmaConstraints: decorators.runtime.figmaConstraints as Extract<
      ElementBlock,
      { type: "elementImage" }
    >["figmaConstraints"],
    motion: decorators.motion,
  });

  return element as Extract<ElementBlock, { type: "elementImage" }>;
}
