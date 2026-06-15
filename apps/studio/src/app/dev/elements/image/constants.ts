import {
  type PbImageAnimationDefaults,
  type PbImageLayoutMode,
  type PbImageVariantKey,
} from "@/app/theme/pb-builder-defaults";
import { DEV_NEUTRAL_IMAGE_DEFAULTS } from "@/app/dev/elements/element-dev-baseline";
import { MOTION_DEFAULTS } from "@pb/contracts";
import {
  MOTION_CURVE_PRESET_OPTIONS,
  MOTION_DIRECTION_OPTIONS,
  MOTION_HYBRID_STACK_OPTIONS,
} from "@/app/dev/elements/_shared/motion-lab";
import {
  ALIGN_OPTIONS,
  ALIGN_Y_OPTIONS,
  BLEND_MODE_OPTIONS,
  INTERACTION_CURSOR_OPTIONS,
  OBJECT_FIT_OPTIONS,
  OVERFLOW_OPTIONS,
  VISIBLE_WHEN_OPERATOR_OPTIONS,
} from "@/app/dev/elements/_shared/dev-controls/foundation-constants";
import type { SettingsCategoryKey } from "./types";

export {
  ALIGN_OPTIONS,
  ALIGN_Y_OPTIONS,
  BLEND_MODE_OPTIONS,
  INTERACTION_CURSOR_OPTIONS,
  OBJECT_FIT_OPTIONS,
  OVERFLOW_OPTIONS,
  VISIBLE_WHEN_OPERATOR_OPTIONS,
};

export const STORAGE_KEY = "pb-element-image-dev-v1";
export const PREVIEW_FALLBACK_IMAGE_SRC = "/dev/image-preview-placeholder.svg";

export const BASE_DEFAULTS = {
  defaultVariant: DEV_NEUTRAL_IMAGE_DEFAULTS.defaultVariant,
  variants: DEV_NEUTRAL_IMAGE_DEFAULTS.variants,
} as const;

export const VARIANT_ORDER: PbImageVariantKey[] = [
  "hero",
  "inline",
  "fullCover",
  "feature",
  "crop",
];

export const VARIANT_LABELS: Record<PbImageVariantKey, string> = {
  hero: "Hero",
  inline: "Inline",
  fullCover: "Full Cover",
  feature: "Feature",
  crop: "Crop",
};

export const CATEGORY_LABELS: Record<SettingsCategoryKey, string> = {
  content: "Content",
  layout: "Layout",
  traits: "Traits",
  animation: "Animation",
  runtime: "Runtime",
};

export const ANIMATION_TRIGGER_OPTIONS: PbImageAnimationDefaults["trigger"][] = [
  "onMount",
  "onFirstVisible",
  "onEveryVisible",
  "onTrigger",
];

export const ANIMATION_EXIT_TRIGGER_OPTIONS: PbImageAnimationDefaults["exitTrigger"][] = [
  "manual",
  "leaveViewport",
];

export const ENTRANCE_PRESET_OPTIONS =
  Object.keys(MOTION_DEFAULTS.entrancePresets).length > 0
    ? Object.keys(MOTION_DEFAULTS.entrancePresets)
    : ["fade"];
export const EXIT_PRESET_OPTIONS =
  Object.keys(MOTION_DEFAULTS.exitPresets).length > 0
    ? Object.keys(MOTION_DEFAULTS.exitPresets)
    : ["fade"];

export const LAYOUT_MODE_OPTIONS: PbImageLayoutMode[] = ["aspectRatio", "fill", "constraints"];
export const DIRECTION_OPTIONS = MOTION_DIRECTION_OPTIONS;
export const CURVE_PRESET_OPTIONS = MOTION_CURVE_PRESET_OPTIONS;
export const HYBRID_STACK_OPTIONS = MOTION_HYBRID_STACK_OPTIONS;

export const IMAGE_VARIABLES_NOT_SUPPORTED_YET = [
  "native imageRotation field (schema-only)",
  "imageCrop pairs with object fit `crop` (variant templates may include defaults)",
  "native imageFilters object (schema-only)",
  "native fillOpacity field (schema-only)",
] as const;
