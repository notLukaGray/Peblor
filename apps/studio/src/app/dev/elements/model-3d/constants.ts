import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { Model3dVariantDefaults, Model3dVariantKey } from "./types";

export const STORAGE_KEY = "pb-element-model-3d-dev-v1";

export const VARIANT_ORDER: Model3dVariantKey[] = ["default", "interactive", "showcase"];

export const VARIANT_LABELS: Record<Model3dVariantKey, string> = {
  default: "Default",
  interactive: "Interactive",
  showcase: "Showcase",
};

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);
const DEFAULT_CAMERA = {
  type: "perspective",
  fov: 45,
  near: 0.1,
  far: 100,
  position: [0, 0.75, 6],
} as const;
const AMBIENT_LIGHT = { type: "ambient", intensity: 0.7, color: "#ffffff" } as const;
const DIRECTIONAL_LIGHT = {
  type: "directional",
  position: [3, 6, 5],
  intensity: 1.1,
  color: "#ffffff",
} as const;
const SPOT_LIGHT = {
  type: "spot",
  position: [2, 5, 4],
  target: [0, 0, 0],
  angle: 0.45,
  penumbra: 0.4,
  intensity: 1,
  color: "#ffffff",
} as const;

const BASE_DEFAULT_VARIANT: Model3dVariantDefaults = {
  animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
  aspectRatio: "16/9",
  textures: {},
  materials: {},
  models: {},
  scene: {
    camera: DEFAULT_CAMERA,
    lights: [AMBIENT_LIGHT, DIRECTIONAL_LIGHT],
    contents: { models: [] },
  },
};

const BASE_INTERACTIVE_VARIANT: Model3dVariantDefaults = {
  animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
  aspectRatio: "1/1",
  textures: {},
  materials: {},
  models: {},
  scene: {
    camera: { ...DEFAULT_CAMERA, position: [0, 0.4, 4.6] },
    lights: [AMBIENT_LIGHT, SPOT_LIGHT],
    cameraEffects: {
      mouseFollow: { sensitivity: 0.32, smoothness: 0.12, desktopOnly: true },
    },
    contents: { models: [] },
  },
};

const BASE_SHOWCASE_VARIANT: Model3dVariantDefaults = {
  animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
  aspectRatio: "21/9",
  textures: {},
  materials: {},
  models: {},
  scene: {
    camera: { ...DEFAULT_CAMERA, position: [0, 0.9, 7.5] },
    lights: [AMBIENT_LIGHT, DIRECTIONAL_LIGHT],
    contents: { models: [] },
  },
};

export const BASE_DEFAULTS: {
  defaultVariant: Model3dVariantKey;
  variants: Record<Model3dVariantKey, Model3dVariantDefaults>;
} = {
  defaultVariant: "default",
  variants: {
    default: BASE_DEFAULT_VARIANT,
    interactive: BASE_INTERACTIVE_VARIANT,
    showcase: BASE_SHOWCASE_VARIANT,
  },
};
