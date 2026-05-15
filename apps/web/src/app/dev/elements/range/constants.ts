import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { RangeVariantDefaults, RangeVariantKey } from "./types";

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);

export const STORAGE_KEY = "pb-element-range-dev-v1";

export const VARIANT_ORDER: RangeVariantKey[] = ["default", "slim", "accent"];

export const VARIANT_LABELS: Record<RangeVariantKey, string> = {
  default: "Default",
  slim: "Slim",
  accent: "Accent",
};

/** Neutral starting presets for range variants in dev foundation authoring. */
export const BASE_DEFAULTS: {
  defaultVariant: RangeVariantKey;
  variants: Record<RangeVariantKey, RangeVariantDefaults>;
} = {
  defaultVariant: "default",
  variants: {
    default: {
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 35,
      ariaLabel: "Adjust value",
      width: "100%",
      height: "2rem",
      style: {
        trackColor: "color-mix(in oklab, var(--pb-text-primary) 22%, transparent)",
        fillColor: "var(--pb-text-primary)",
        trackHeight: "4px",
        thumbSize: "14px",
        borderRadius: "9999px",
      },
      animation: NEUTRAL_ANIMATION,
    },
    slim: {
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 60,
      ariaLabel: "Adjust value",
      width: "100%",
      height: "1.5rem",
      style: {
        trackColor: "color-mix(in oklab, var(--pb-text-primary) 16%, transparent)",
        fillColor: "color-mix(in oklab, var(--pb-text-primary) 72%, transparent)",
        trackHeight: "2px",
        thumbSize: "10px",
        borderRadius: "9999px",
      },
      animation: { ...JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) },
    },
    accent: {
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 80,
      ariaLabel: "Adjust value",
      width: "100%",
      height: "2rem",
      style: {
        trackColor: "color-mix(in oklab, var(--pb-text-primary) 18%, transparent)",
        fillColor: "var(--pb-accent)",
        trackHeight: "4px",
        thumbSize: "16px",
        borderRadius: "9999px",
      },
      animation: { ...JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) },
    },
  },
};
