import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { VideoVariantDefaults, VideoVariantKey } from "./types";

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);

export const STORAGE_KEY = "pb-element-video-dev-v1";
export const PREVIEW_FALLBACK_POSTER_SRC = "/dev/image-preview-placeholder.svg";

export const VIDEO_MODULE_PRESET_OPTIONS = [
  { key: "video-player", label: "Web Player · Default" },
  { key: "video-player-compact", label: "Web Player · Compact" },
  { key: "video-player-full", label: "Web Player · Full" },
  { key: "video-player-minimal", label: "Web Player · Minimal" },
] as const;

export const VARIANT_ORDER: VideoVariantKey[] = ["inline", "compact", "fullcover", "hero"];

export const VARIANT_LABELS: Record<VideoVariantKey, string> = {
  inline: "Inline",
  compact: "Compact",
  fullcover: "Full Cover",
  hero: "Hero",
};

export const VIDEO_OBJECT_FIT_OPTIONS = ["cover", "contain", "fillWidth", "fillHeight"] as const;

export const BASE_DEFAULTS: {
  defaultVariant: VideoVariantKey;
  variants: Record<VideoVariantKey, VideoVariantDefaults>;
} = {
  defaultVariant: "inline",
  variants: {
    inline: {
      src: "",
      poster: "",
      objectFit: "cover",
      aspectRatio: "16/9",
      showPlayButton: true,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    compact: {
      src: "",
      poster: "",
      objectFit: "cover",
      aspectRatio: "4/3",
      module: "video-player-compact",
      showPlayButton: true,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    fullcover: {
      src: "",
      poster: "",
      objectFit: "cover",
      module: "video-player-full",
      showPlayButton: false,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    hero: {
      src: "",
      poster: "",
      objectFit: "cover",
      aspectRatio: "21/9",
      module: "video-player",
      showPlayButton: true,
      autoplay: true,
      loop: true,
      muted: true,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
  },
};
