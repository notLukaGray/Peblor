import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { InputVariantDefaults, InputVariantKey } from "./types";

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);

export const STORAGE_KEY = "pb-element-input-dev-v1";

export const VARIANT_ORDER: InputVariantKey[] = ["default", "compact", "minimal", "glass"];

export const VARIANT_LABELS: Record<InputVariantKey, string> = {
  default: "Default",
  compact: "Compact",
  minimal: "Minimal",
  glass: "Glass",
};

/** Neutral starting presets for input variants in dev foundation authoring. */
export const BASE_DEFAULTS: {
  defaultVariant: InputVariantKey;
  variants: Record<InputVariantKey, InputVariantDefaults>;
} = {
  defaultVariant: "default",
  variants: {
    default: {
      placeholder: "Search",
      ariaLabel: "Search",
      showIcon: true,
      color: "rgba(255,255,255,0.85)",
      animation: NEUTRAL_ANIMATION,
    },
    compact: {
      placeholder: "Search...",
      ariaLabel: "Search",
      showIcon: false,
      color: "rgba(255,255,255,0.7)",
      height: "2.25rem",
      animation: { ...JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) },
    },
    minimal: {
      placeholder: "Type to search",
      ariaLabel: "Search",
      showIcon: false,
      color: "rgba(255,255,255,0.5)",
      animation: { ...JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) },
    },
    glass: {
      placeholder: "Search",
      ariaLabel: "Search",
      showIcon: false,
      color: "rgba(255,255,255,0.9)",
      effects: [
        {
          type: "glass",
          lightIntensity: 0.6,
          lightAngle: 135,
          refraction: 0.3,
          depth: 60,
          frost: "8px",
        },
      ],
      animation: { ...JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) },
    },
  },
};
