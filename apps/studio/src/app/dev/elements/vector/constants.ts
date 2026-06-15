import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { VectorVariantDefaults, VectorVariantKey } from "./types";

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);

export const STORAGE_KEY = "pb-element-vector-dev-v1";

export const VARIANT_ORDER: VectorVariantKey[] = ["default", "outline", "filled"];

export const VARIANT_LABELS: Record<VectorVariantKey, string> = {
  default: "Default",
  outline: "Outline",
  filled: "Filled",
};

const DEMO_SHAPES_DEFAULT = [
  {
    type: "circle" as const,
    cx: 32,
    cy: 32,
    r: 30,
    style: {
      fill: "rgba(255,255,255,0.15)",
      stroke: "rgba(255,255,255,0.6)",
      strokeWidth: 2,
    },
  },
] as unknown as VectorVariantDefaults["shapes"];

const DEMO_SHAPES_OUTLINE = [
  {
    type: "circle" as const,
    cx: 32,
    cy: 32,
    r: 30,
    style: {
      fill: "none",
      stroke: "rgba(255,255,255,0.8)",
      strokeWidth: 2,
    },
  },
] as unknown as VectorVariantDefaults["shapes"];

const DEMO_SHAPES_FILLED = [
  {
    type: "circle" as const,
    cx: 32,
    cy: 32,
    r: 30,
    style: {
      fill: "rgba(255,255,255,0.85)",
      stroke: "none",
      strokeWidth: 0,
    },
  },
] as unknown as VectorVariantDefaults["shapes"];

export const BASE_DEFAULTS: {
  defaultVariant: VectorVariantKey;
  variants: Record<VectorVariantKey, VectorVariantDefaults>;
} = {
  defaultVariant: "default",
  variants: {
    default: {
      viewBox: "0 0 64 64",
      shapes: DEMO_SHAPES_DEFAULT,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    outline: {
      viewBox: "0 0 64 64",
      shapes: DEMO_SHAPES_OUTLINE,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    filled: {
      viewBox: "0 0 64 64",
      shapes: DEMO_SHAPES_FILLED,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
  },
};
