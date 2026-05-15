import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { triggerActionSchema } from "./schema-primitives";

const textureDefImageSchema = z.object({
  type: z.literal("image"),
  source: z.string(),
  wrapS: z.number().optional(),
  wrapT: z.number().optional(),
});
const textureDefVideoSchema = z.object({
  type: z.literal("video"),
  source: z.string(),
  loop: z.boolean().optional(),
  muted: z.boolean().optional(),
  useAsAlphaMap: z.boolean().optional(),
});
export const textureDefSchema = z.discriminatedUnion("type", [
  textureDefImageSchema,
  textureDefVideoSchema,
]);

const materialSlotValueSchema = z.union([z.string(), z.number()]);

export const materialDefSchema = z
  .object({
    albedo: materialSlotValueSchema.optional(),
    normal: materialSlotValueSchema.optional(),
    emissive: materialSlotValueSchema.optional(),
    roughness: materialSlotValueSchema.optional(),
    metallic: materialSlotValueSchema.optional(),
    ao: materialSlotValueSchema.optional(),
  })
  .passthrough();

export const modelDefSchema = z.object({
  geometry: z.string(),
  materialBindings: z.record(z.string(), z.string()).optional(),
});

const environmentHdriSchema = z.object({
  type: z.literal("hdri"),
  path: z.string(),
  intensity: z.number().optional(),
});
export const environmentDefSchema = z.discriminatedUnion("type", [environmentHdriSchema]);

const lightAmbientSchema = z.object({
  type: z.literal("ambient"),
  intensity: z.number().optional(),
  color: z.string().optional(),
});
const lightDirectionalSchema = z
  .object({
    type: z.literal("directional"),
    position: z.tuple([z.number(), z.number(), z.number()]).optional(),
    intensity: z.number().optional(),
    color: z.string().optional(),
    castShadow: z.boolean().optional(),
  })
  .passthrough();
const lightPointSchema = z
  .object({
    type: z.literal("point"),
    position: z.tuple([z.number(), z.number(), z.number()]),
    intensity: z.number().optional(),
    distance: z.number().optional(),
    decay: z.number().optional(),
    color: z.string().optional(),
  })
  .passthrough();
const lightSpotSchema = z
  .object({
    type: z.literal("spot"),
    position: z.tuple([z.number(), z.number(), z.number()]),
    target: z.tuple([z.number(), z.number(), z.number()]).optional(),
    angle: z.number().optional(),
    penumbra: z.number().optional(),
    intensity: z.number().optional(),
    color: z.string().optional(),
    castShadow: z.boolean().optional(),
  })
  .passthrough();
export const lightDefSchema = z.discriminatedUnion("type", [
  lightAmbientSchema,
  lightDirectionalSchema,
  lightPointSchema,
  lightSpotSchema,
]);

const cameraOrthographicSchema = z
  .object({
    type: z.literal("orthographic"),
    size: z.number().optional(),
    near: z.number().optional(),
    far: z.number().optional(),
  })
  .passthrough();
const cameraPerspectiveSchema = z
  .object({
    type: z.literal("perspective"),
    fov: z.number().optional(),
    near: z.number().optional(),
    far: z.number().optional(),
    position: z.tuple([z.number(), z.number(), z.number()]).optional(),
  })
  .passthrough();
export const cameraDefSchema = z.discriminatedUnion("type", [
  cameraOrthographicSchema,
  cameraPerspectiveSchema,
]);

export const modelInstanceDefSchema = z.object({
  model: z.string(),
  position: z.tuple([z.number(), z.number(), z.number()]).optional(),
  rotation: z.tuple([z.number(), z.number(), z.number()]).optional(),
  scale: z.union([z.number(), z.tuple([z.number(), z.number(), z.number()])]).optional(),
  animation: z
    .object({
      clip: z.string().optional(),
      loop: z.boolean().optional(),
      playMode: z.enum(["loop", "once", "pingPong"]).optional(),
    })
    .optional(),
  onPointerEnter: triggerActionSchema.optional(),
  onPointerLeave: triggerActionSchema.optional(),
  onClick: triggerActionSchema.optional(),
  href: z.string().optional(),
  id: z.string().optional(),
  meshName: z.string().optional(),
  onPointerDown: triggerActionSchema.optional(),
  onPointerUp: triggerActionSchema.optional(),
  onDoubleClick: triggerActionSchema.optional(),
  onAnimationComplete: triggerActionSchema.optional(),
});

export const cameraEffectsSchema = z
  .object({
    bobbing: z.object({ amount: z.number().optional(), speed: z.number().optional() }).optional(),
    mouseFollow: z
      .object({
        sensitivity: z.number().optional(),
        smoothness: z.number().optional(),
        desktopOnly: z.boolean().optional(),
      })
      .optional(),
  })
  .optional();

export const sceneDefSchema = z.object({
  environment: environmentDefSchema.optional(),
  lights: z.array(lightDefSchema).optional(),
  camera: cameraDefSchema,
  cameraEffects: cameraEffectsSchema,
  contents: z.object({ models: z.array(modelInstanceDefSchema).optional() }).optional(),
});

export const canvasDefSchema = z
  .object({
    dpr: z.number().optional(),
    gl: z
      .object({
        antialias: z.boolean().optional(),
        powerPreference: z.enum(["default", "high-performance", "low-power"]).optional(),
        alpha: z.boolean().optional(),
      })
      .optional(),
  })
  .passthrough();

const effectBrightnessContrastSchema = z.object({
  type: z.literal("brightnessContrast"),
  brightness: z.number().optional(),
  contrast: z.number().optional(),
});
const effectNoiseSchema = z.object({ type: z.literal("noise"), opacity: z.number().optional() });
const effectBloomSchema = z.object({
  type: z.literal("bloom"),
  intensity: z.number().optional(),
  luminanceThreshold: z.number().optional(),
  luminanceSmoothing: z.number().optional(),
  radius: z.number().optional(),
  levels: z.number().optional(),
  mipmapBlur: z.boolean().optional(),
  disabledOnMobile: z.boolean().optional(),
});
const effectSsaoSchema = z.object({
  type: z.literal("ssao"),
  samples: z.number().optional(),
  rings: z.number().optional(),
  radius: z.number().optional(),
  intensity: z.number().optional(),
  luminanceInfluence: z.number().optional(),
  bias: z.number().optional(),
  fade: z.number().optional(),
  distanceThreshold: z.number().optional(),
  distanceFalloff: z.number().optional(),
  rangeThreshold: z.number().optional(),
  rangeFalloff: z.number().optional(),
  disabledOnMobile: z.boolean().optional(),
});
export const postProcessingEffectSchema = z.discriminatedUnion("type", [
  effectBrightnessContrastSchema,
  effectNoiseSchema,
  effectBloomSchema,
  effectSsaoSchema,
]);

export const elementModel3DSchema = z
  .object({
    type: z.literal("elementModel3D"),
    ariaLabel: z.string().optional(),
    initiallyLoaded: z.boolean().optional(),
    textures: z.record(z.string(), textureDefSchema).optional(),
    materials: z.record(z.string(), materialDefSchema).optional(),
    models: z.record(z.string(), modelDefSchema).optional(),
    scene: sceneDefSchema,
    canvas: canvasDefSchema.optional(),
    postProcessing: z.array(postProcessingEffectSchema).optional(),
    module: z.string().optional(),
  })
  .merge(elementLayoutSchema);
