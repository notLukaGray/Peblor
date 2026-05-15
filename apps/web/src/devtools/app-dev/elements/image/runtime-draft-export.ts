import {
  buildImageMotionTimingFromAnimationDefaults,
  type PbImageAnimationDefaults,
  type PbImageVariantDefaults,
  type PbImageVariantKey,
} from "@/app/theme/pb-builder-defaults";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import { PREVIEW_FALLBACK_IMAGE_SRC } from "@/app/dev/elements/image/constants";
import { buildRuntimePreviewState, parseLooseValue } from "./runtime-draft-core";

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
    value: parseLooseValue(draft.visibleWhenValue),
  };
}

function buildRuntimeDecorators(draft: ImageRuntimeDraft) {
  const runtime = buildRuntimePreviewState(draft);
  return {
    visibleWhen: buildVisibleWhen(draft),
    interactions: runtime.cursor ? { cursor: runtime.cursor } : undefined,
    aria: runtime.ariaLabel ? { "aria-label": runtime.ariaLabel } : undefined,
    link: runtime.linkHref ? { ref: runtime.linkHref, external: runtime.linkExternal } : undefined,
    wrapperStyle: runtime.wrapperStyle,
    figmaConstraints: runtime.figmaConstraints,
    motion: runtime.motion,
  };
}

export function buildCustomElementSnippet(
  variantKey: PbImageVariantKey,
  variant: PbImageVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  const runtime = buildRuntimeDecorators(draft);
  const element = omitUndefined({
    type: "elementImage",
    variant: variantKey,
    src: PREVIEW_FALLBACK_IMAGE_SRC,
    alt: "Custom image",
    objectFit: variant.objectFit,
    objectPosition: variant.objectPosition,
    imageCrop: variant.imageCrop,
    aspectRatio: variant.aspectRatio,
    width: variant.width,
    height: variant.height,
    constraints: variant.constraints,
    borderRadius: variant.borderRadius,
    align: variant.align,
    alignY: variant.alignY,
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
    motionTiming: buildImageMotionTimingFromAnimationDefaults(variant.animation),
    link: runtime.link,
    interactions: runtime.interactions,
    visibleWhen: runtime.visibleWhen,
    aria: runtime.aria,
    wrapperStyle: runtime.wrapperStyle,
    figmaConstraints: runtime.figmaConstraints,
    motion: runtime.motion,
  });

  return element as Record<string, unknown>;
}

/** Runtime passthrough for typography elements (heading / body / link): no image `link` field. */
export function mergeTypographyDevRuntime(
  draft: ImageRuntimeDraft,
  element: Record<string, unknown>
): Record<string, unknown> {
  const runtime = buildRuntimeDecorators(draft);
  const {
    animation,
    motionTiming: storedTiming,
    ...elementRest
  } = element as {
    animation?: PbImageAnimationDefaults;
    motionTiming?: unknown;
  } & Record<string, unknown>;

  const { wrapperStyle: elementWrapperStyle, ...elementWithoutWrapper } = elementRest as {
    wrapperStyle?: Record<string, unknown>;
  } & Record<string, unknown>;

  const motionTiming =
    animation != null
      ? buildImageMotionTimingFromAnimationDefaults(animation)
      : (storedTiming as Record<string, unknown> | undefined);

  // Draft `wrapperStyleJson` overlays the block. When it is empty, `runtime.wrapperStyle` is
  // undefined — we must not wipe author `wrapperStyle` from the incoming element (layout dev
  // cards, handoff snippets, etc.).
  const mergedWrapperStyle =
    runtime.wrapperStyle != null && typeof runtime.wrapperStyle === "object"
      ? {
          ...(elementWrapperStyle != null && typeof elementWrapperStyle === "object"
            ? elementWrapperStyle
            : {}),
          ...runtime.wrapperStyle,
        }
      : elementWrapperStyle;

  return omitUndefined({
    ...elementWithoutWrapper,
    motionTiming,
    interactions: runtime.interactions,
    visibleWhen: runtime.visibleWhen,
    aria: runtime.aria,
    ...(mergedWrapperStyle != null && typeof mergedWrapperStyle === "object"
      ? { wrapperStyle: mergedWrapperStyle }
      : {}),
    figmaConstraints: runtime.figmaConstraints,
    motion: runtime.motion,
  });
}
