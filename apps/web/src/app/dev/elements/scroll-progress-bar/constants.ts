import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { ScrollProgressBarVariantDefaults, ScrollProgressBarVariantKey } from "./types";

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);

export const STORAGE_KEY = "pb-element-scroll-progress-bar-dev-v1";

export const VARIANT_ORDER: ScrollProgressBarVariantKey[] = ["default", "minimal", "bold"];

export const VARIANT_LABELS: Record<ScrollProgressBarVariantKey, string> = {
  default: "Default",
  minimal: "Minimal",
  bold: "Bold",
};

export const BASE_DEFAULTS: {
  defaultVariant: ScrollProgressBarVariantKey;
  variants: Record<ScrollProgressBarVariantKey, ScrollProgressBarVariantDefaults>;
} = {
  defaultVariant: "default",
  variants: {
    default: {
      height: "3px",
      fill: "rgba(255,255,255,0.9)",
      trackBackground: "rgba(255,255,255,0.15)",
      offset: ["start end", "end start"],
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    minimal: {
      height: "1px",
      fill: "rgba(255,255,255,0.6)",
      trackBackground: "transparent",
      offset: ["start end", "end start"],
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    bold: {
      height: "5px",
      fill: "#ffffff",
      trackBackground: "rgba(255,255,255,0.2)",
      offset: ["start end", "end start"],
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
  },
};
