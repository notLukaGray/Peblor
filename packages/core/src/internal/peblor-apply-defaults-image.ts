import type { ElementBlock } from "@pb/contracts";

import { buildImageMotionTimingFromAnimationDefaults } from "./defaults/pb-builder-defaults";
import { getPbBuilderDefaults } from "./adapters/host-config";
import {
  asRecord,
  isBoolean,
  isConstraintObject,
  isFiniteNumber,
  isMissingResponsiveString,
  isMotionExitTrigger,
  isNonEmptyString,
  isResponsiveStringValue,
  resolveImageVariantKey,
} from "./peblor-apply-defaults-helpers";

export function applyImageDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementImage") return el;

  const imageDefaults = getPbBuilderDefaults().elements.image;
  if (!imageDefaults) return el;
  const image = el as ElementBlock & {
    variant?: unknown;
    motion?: unknown;
    motionTiming?: unknown;
    objectPosition?: unknown;
    objectFit?: unknown;
    aspectRatio?: unknown;
    width?: unknown;
    height?: unknown;
    constraints?: unknown;
    imageCrop?: unknown;
    borderRadius?: unknown;
    selfAlign?: unknown;
    alignY?: unknown;
    marginTop?: unknown;
    marginBottom?: unknown;
    marginLeft?: unknown;
    marginRight?: unknown;
    rotate?: unknown;
    flipHorizontal?: unknown;
    flipVertical?: unknown;
    opacity?: unknown;
    blendMode?: unknown;
    boxShadow?: unknown;
    filter?: unknown;
    bgBlur?: unknown;
    scroll?: unknown;
    hidden?: unknown;
    priority?: unknown;
    exitPreset?: unknown;
  };
  const variantKey = resolveImageVariantKey(image.variant);
  const variant = imageDefaults.variants[variantKey];
  const variantMotionTiming = buildImageMotionTimingFromAnimationDefaults(variant.animation);
  const hasCustomMotion = image.motion != null;

  let changed = false;
  const out: Record<string, unknown> = { ...image };

  if (image.objectFit == null) {
    out.objectFit = variant.objectFit;
    changed = true;
  }
  if (variant.layoutMode === "aspectRatio") {
    if (
      isMissingResponsiveString(image.aspectRatio) &&
      isResponsiveStringValue(variant.aspectRatio)
    ) {
      out.aspectRatio = variant.aspectRatio;
      changed = true;
    }
  } else if (variant.layoutMode === "fill") {
    if (isMissingResponsiveString(image.width) && isResponsiveStringValue(variant.width)) {
      out.width = variant.width;
      changed = true;
    }
    if (isMissingResponsiveString(image.height) && isResponsiveStringValue(variant.height)) {
      out.height = variant.height;
      changed = true;
    }
  } else if (variant.layoutMode === "constraints") {
    if (image.constraints == null && variant.constraints != null) {
      out.constraints = variant.constraints;
      changed = true;
    } else if (isConstraintObject(image.constraints) && isConstraintObject(variant.constraints)) {
      const nextConstraints: Record<string, unknown> = { ...image.constraints };
      let constraintsChanged = false;
      for (const key of ["minWidth", "maxWidth", "minHeight", "maxHeight"] as const) {
        if (!isNonEmptyString(nextConstraints[key]) && isNonEmptyString(variant.constraints[key])) {
          nextConstraints[key] = variant.constraints[key];
          constraintsChanged = true;
        }
      }
      if (constraintsChanged) {
        out.constraints = nextConstraints;
        changed = true;
      }
    }
  }
  if (image.imageCrop == null && variant.imageCrop != null) {
    out.imageCrop = variant.imageCrop;
    changed = true;
  }
  if (!isNonEmptyString(image.objectPosition) && isNonEmptyString(variant.objectPosition)) {
    out.objectPosition = variant.objectPosition;
    changed = true;
  }
  if (
    isMissingResponsiveString(image.borderRadius) &&
    isResponsiveStringValue(variant.borderRadius)
  ) {
    out.borderRadius = variant.borderRadius;
    changed = true;
  }
  if (image.selfAlign == null && variant.selfAlign != null) {
    out.selfAlign = variant.selfAlign;
    changed = true;
  }
  if (image.alignY == null && variant.alignY != null) {
    out.alignY = variant.alignY;
    changed = true;
  }
  if (isMissingResponsiveString(image.marginTop) && isResponsiveStringValue(variant.marginTop)) {
    out.marginTop = variant.marginTop;
    changed = true;
  }
  if (
    isMissingResponsiveString(image.marginBottom) &&
    isResponsiveStringValue(variant.marginBottom)
  ) {
    out.marginBottom = variant.marginBottom;
    changed = true;
  }
  if (isMissingResponsiveString(image.marginLeft) && isResponsiveStringValue(variant.marginLeft)) {
    out.marginLeft = variant.marginLeft;
    changed = true;
  }
  if (
    isMissingResponsiveString(image.marginRight) &&
    isResponsiveStringValue(variant.marginRight)
  ) {
    out.marginRight = variant.marginRight;
    changed = true;
  }
  if (image.rotate == null && variant.rotate != null) {
    out.rotate = variant.rotate;
    changed = true;
  }
  if (!isBoolean(image.flipHorizontal) && isBoolean(variant.flipHorizontal)) {
    out.flipHorizontal = variant.flipHorizontal;
    changed = true;
  }
  if (!isBoolean(image.flipVertical) && isBoolean(variant.flipVertical)) {
    out.flipVertical = variant.flipVertical;
    changed = true;
  }
  if (!isFiniteNumber(image.opacity) && isFiniteNumber(variant.opacity)) {
    out.opacity = variant.opacity;
    changed = true;
  }
  if (!isNonEmptyString(image.blendMode) && isNonEmptyString(variant.blendMode)) {
    out.blendMode = variant.blendMode;
    changed = true;
  }
  if (!isNonEmptyString(image.boxShadow) && isNonEmptyString(variant.boxShadow)) {
    out.boxShadow = variant.boxShadow;
    changed = true;
  }
  if (!isNonEmptyString(image.filter) && isNonEmptyString(variant.filter)) {
    out.filter = variant.filter;
    changed = true;
  }
  if (!isNonEmptyString(image.bgBlur) && isNonEmptyString(variant.bgBlur)) {
    out.bgBlur = variant.bgBlur;
    changed = true;
  }
  if (!isNonEmptyString(image.scroll) && isNonEmptyString(variant.scroll)) {
    out.scroll = variant.scroll;
    changed = true;
  }
  if (!isBoolean(image.hidden) && isBoolean(variant.hidden)) {
    out.hidden = variant.hidden;
    changed = true;
  }
  if (!isBoolean(image.priority) && isBoolean(variant.priority)) {
    out.priority = variant.priority;
    changed = true;
  }

  if (!hasCustomMotion) {
    const motionTiming = asRecord(image.motionTiming);
    if (!motionTiming) {
      out.motionTiming = variantMotionTiming;
      changed = true;
    } else {
      const nextMotionTiming: Record<string, unknown> = { ...motionTiming };
      let motionChanged = false;
      if (!isNonEmptyString(nextMotionTiming.trigger)) {
        nextMotionTiming.trigger = variantMotionTiming.trigger;
        motionChanged = true;
      }
      if (!isNonEmptyString(nextMotionTiming.entrancePreset)) {
        nextMotionTiming.entrancePreset = variantMotionTiming.entrancePreset;
        motionChanged = true;
      }
      if (!isNonEmptyString(nextMotionTiming.exitPreset)) {
        nextMotionTiming.exitPreset = variantMotionTiming.exitPreset;
        motionChanged = true;
      }
      if (
        !isMotionExitTrigger(nextMotionTiming.exitTrigger) &&
        isMotionExitTrigger(variantMotionTiming.exitTrigger)
      ) {
        nextMotionTiming.exitTrigger = variantMotionTiming.exitTrigger;
        motionChanged = true;
      }
      if (nextMotionTiming.exitViewport == null && variantMotionTiming.exitViewport != null) {
        nextMotionTiming.exitViewport = variantMotionTiming.exitViewport;
        motionChanged = true;
      }
      if (nextMotionTiming.entranceMotion == null && variantMotionTiming.entranceMotion != null) {
        nextMotionTiming.entranceMotion = variantMotionTiming.entranceMotion;
        motionChanged = true;
      }
      if (nextMotionTiming.exitMotion == null && variantMotionTiming.exitMotion != null) {
        nextMotionTiming.exitMotion = variantMotionTiming.exitMotion;
        motionChanged = true;
      }
      if (motionChanged) {
        out.motionTiming = nextMotionTiming;
        changed = true;
      }
    }
  }

  return changed ? (out as ElementBlock) : el;
}
