import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { SpacerVariantDefaults, SpacerVariantKey } from "./types";

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);

export const STORAGE_KEY = "pb-element-spacer-dev-v1";

export const VARIANT_ORDER: SpacerVariantKey[] = ["sm", "md", "lg"];

export const VARIANT_LABELS: Record<SpacerVariantKey, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
};

export const BASE_DEFAULTS: {
  defaultVariant: SpacerVariantKey;
  variants: Record<SpacerVariantKey, SpacerVariantDefaults>;
} = {
  defaultVariant: "md",
  variants: {
    sm: {
      height: "1.5rem",
      marginTop: "0.5rem",
      marginBottom: "0.5rem",
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    md: {
      height: "3rem",
      marginTop: "1rem",
      marginBottom: "1rem",
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    lg: {
      height: "6rem",
      marginTop: "2rem",
      marginBottom: "2rem",
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
  },
};
