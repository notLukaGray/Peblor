import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { RiveVariantDefaults, RiveVariantKey } from "./types";

export const STORAGE_KEY = "pb-element-rive-dev-v1";

export const VARIANT_ORDER: RiveVariantKey[] = ["default", "autoplay", "cover"];

export const VARIANT_LABELS: Record<RiveVariantKey, string> = {
  default: "Default",
  autoplay: "Autoplay",
  cover: "Cover",
};

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);

const BASE_DEFAULT_VARIANT: RiveVariantDefaults = {
  animation: NEUTRAL_ANIMATION,
  src: "",
  artboard: undefined,
  stateMachine: undefined,
  autoplay: false,
  fit: "contain",
  aspectRatio: "1/1",
};

const BASE_AUTOPLAY_VARIANT: RiveVariantDefaults = {
  animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
  src: "",
  artboard: undefined,
  stateMachine: undefined,
  autoplay: true,
  fit: "cover",
  aspectRatio: "16/9",
};

const BASE_COVER_VARIANT: RiveVariantDefaults = {
  animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
  src: "",
  artboard: undefined,
  stateMachine: undefined,
  autoplay: true,
  fit: "cover",
  aspectRatio: "21/9",
  overflow: "hidden",
};

export const BASE_DEFAULTS: {
  defaultVariant: RiveVariantKey;
  variants: Record<RiveVariantKey, RiveVariantDefaults>;
} = {
  defaultVariant: "default",
  variants: {
    default: BASE_DEFAULT_VARIANT,
    autoplay: BASE_AUTOPLAY_VARIANT,
    cover: BASE_COVER_VARIANT,
  },
};

export const RIVE_FIT_OPTIONS = [
  "contain",
  "cover",
  "fill",
  "fitWidth",
  "fitHeight",
  "scaleDown",
  "none",
] as const;

export type RiveFitOption = (typeof RIVE_FIT_OPTIONS)[number];
