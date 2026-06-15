import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { VideoTimeVariantDefaults, VideoTimeVariantKey } from "./types";

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);

export const STORAGE_KEY = "pb-element-video-time-dev-v1";

export const VARIANT_ORDER: VideoTimeVariantKey[] = ["default", "compact", "overlay"];

export const VARIANT_LABELS: Record<VideoTimeVariantKey, string> = {
  default: "Default",
  compact: "Compact",
  overlay: "Overlay",
};

export const BASE_DEFAULTS: {
  defaultVariant: VideoTimeVariantKey;
  variants: Record<VideoTimeVariantKey, VideoTimeVariantDefaults>;
} = {
  defaultVariant: "default",
  variants: {
    default: {
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    compact: {
      width: "3.5rem",
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    overlay: {
      width: "auto",
      style: {
        padding: "0.25rem 0.5rem",
        borderRadius: "0.5rem",
        background: "rgba(0,0,0,0.55)",
        color: "#ffffff",
      },
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
  },
};
