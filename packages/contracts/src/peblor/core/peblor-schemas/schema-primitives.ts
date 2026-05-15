import { z } from "zod";
import type { PeblorAction } from "../trigger-action-types";
import { ANALYTICS_EVENT_NAMES, type AnalyticsEventKey } from "../../../analytics/events";

// Typed payload schemas for 3D actions.
// payload.id is optional: absent means broadcast to all 3D elements; present means target one.
// All action-specific fields are optional — Zod validates types when present, but never
// forces them if the action doesn't need them (e.g. three.resetCamera needs no fields at all).

const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
const threeBase = z.object({ id: z.string().optional() });

// No-payload actions: load/unload/toggle/reset/stop-loops/etc. Only need optional id.
const threeBasePayload = threeBase.optional();

// Visibility
const threeSetVisibilityPayload = threeBase.extend({ visible: z.boolean().optional() }).optional();

// Fade in/out
const threeFadePayload = threeBase.extend({ durationMs: z.number().optional() }).optional();

// Named animation (play/pause/toggle/set)
const threeAnimationNamePayload = threeBase.extend({ name: z.string().optional() }).optional();

// Cross-fade between clips
const threeCrossFadePayload = threeBase
  .extend({
    name: z.string().optional(),
    durationMs: z.number().optional(),
    warp: z.boolean().optional(),
  })
  .optional();

// Scrub animation to a specific progress point
const threeScrubPayload = threeBase
  .extend({
    clip: z.string().optional(),
    progress: z.number().min(0).max(1).optional(),
  })
  .optional();

// Camera preset name
const threeCameraPresetPayload = threeBase.extend({ preset: z.string().optional() }).optional();

// Absolute position (accepts either a vec3 or individual x/y/z)
const threeSetPositionPayload = threeBase
  .extend({
    position: vec3Schema.optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
    durationMs: z.number().optional(),
  })
  .optional();

// Relative translation delta
const threeTranslateByPayload = threeBase
  .extend({
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
    durationMs: z.number().optional(),
  })
  .optional();

// Absolute rotation (Euler angles, accepts vec3 or individual axes)
const threeSetRotationPayload = threeBase
  .extend({
    rotation: vec3Schema.optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
    durationMs: z.number().optional(),
  })
  .optional();

// Relative rotation delta
const threeRotateByPayload = threeBase
  .extend({
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
  })
  .optional();

// Absolute scale (uniform or per-axis)
const threeSetScalePayload = threeBase
  .extend({
    scale: z.union([z.number(), vec3Schema]).optional(),
    durationMs: z.number().optional(),
  })
  .optional();

// Relative scale multiplier
const threeScaleByPayload = threeBase.extend({ factor: z.number().optional() }).optional();

// Animate to a target transform
const threeAnimateToPayload = threeBase
  .extend({
    position: vec3Schema.optional(),
    rotation: vec3Schema.optional(),
    scale: z.union([z.number(), vec3Schema]).optional(),
    durationMs: z.number().optional(),
  })
  .optional();

// Continuous rotation loop
const threeContinuousRotatePayload = threeBase
  .extend({
    axis: z.enum(["x", "y", "z"]).optional(),
    speed: z.number().optional(),
  })
  .optional();

// Continuous float (bob up/down)
const threeContinuousFloatPayload = threeBase
  .extend({
    amount: z.number().optional(),
    speed: z.number().optional(),
  })
  .optional();

// Continuous scale pulse
const threeContinuousScalePayload = threeBase
  .extend({
    min: z.number().optional(),
    max: z.number().optional(),
    speed: z.number().optional(),
  })
  .optional();

// Camera animation
const threeAnimateCameraPayload = threeBase
  .extend({
    position: vec3Schema.optional(),
    lookAt: vec3Schema.optional(),
    fov: z.number().optional(),
    durationMs: z.number().optional(),
  })
  .optional();

// Orbit controls
const threeOrbitEnablePayload = threeBase
  .extend({
    autoRotate: z.boolean().optional(),
    autoRotateSpeed: z.number().optional(),
  })
  .optional();

// Material color (hex or CSS color string)
const threeMaterialColorPayload = threeBase
  .extend({
    color: z.string().optional(),
    meshName: z.string().optional(),
  })
  .optional();

// Material opacity
const threeMaterialOpacityPayload = threeBase
  .extend({
    opacity: z.number().min(0).max(1).optional(),
    meshName: z.string().optional(),
    durationMs: z.number().optional(),
  })
  .optional();

// Emissive intensity
const threeEmissiveIntensityPayload = threeBase
  .extend({
    intensity: z.number().optional(),
    meshName: z.string().optional(),
  })
  .optional();

// Light intensity (target by index or name)
const threeLightIntensityPayload = threeBase
  .extend({
    intensity: z.number().optional(),
    index: z.number().int().optional(),
    name: z.string().optional(),
  })
  .optional();

// Light color
const threeLightColorPayload = threeBase
  .extend({
    color: z.string().optional(),
    index: z.number().int().optional(),
    name: z.string().optional(),
  })
  .optional();

// Post-processing parameter tweak
const threePostProcessingParamPayload = threeBase
  .extend({
    effect: z.string().optional(),
    param: z.string().optional(),
    value: z.number().optional(),
  })
  .optional();

// Toggle a post-processing effect on/off (omit enabled to toggle)
const threeTogglePostEffectPayload = threeBase
  .extend({
    effect: z.string().optional(),
    enabled: z.boolean().optional(),
  })
  .optional();

// Rive payloads — minimal contracts per action, heterogeneous values still allowed via catchall.

// rive.setInput / rive.fireTrigger: require `input` (state-machine input name). `id` targets a
// specific Rive element; absent means broadcast. `value` is required for setInput (boolean|number|string).
const riveInputPayload = z
  .object({ id: z.string().optional(), input: z.string() })
  .catchall(z.unknown())
  .optional();

const riveSetInputPayload = z
  .object({
    id: z.string().optional(),
    input: z.string(),
    value: z.union([z.boolean(), z.number(), z.string()]),
  })
  .catchall(z.unknown())
  .optional();

// rive.play/pause/reset: no required keys; animationName is optional.
const riveBasePayload = z.record(z.string(), z.unknown()).optional();

// Loose payload schema for asset/media element actions (assetPlay, assetPause, videoFullscreen, etc.)
// Intentionally loose: the media dispatcher reads target id, time codes, and other heterogeneous fields.
const assetPayload = z.record(z.string(), z.unknown()).optional();

// Self-referential lazy stub — used in conditionalAction's then/else/branch fields.
// Typed as ZodTypeAny to break the circular inference cycle; runtime shape is identical
// to triggerActionSchema (they refer to the same object after initialisation).
const lazyTriggerAction: z.ZodTypeAny = z.lazy(() => triggerActionSchema);

// Recursive JSON value schema — mirrors the JsonValue type from core/lib/json-value.ts.
// Used in place of z.unknown() wherever a value must be JSON-serialisable.
export const jsonValueSchema: z.ZodType<import("../../../core/lib/json-value").JsonValue> = z.lazy(
  () =>
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(jsonValueSchema),
      z.record(z.string(), jsonValueSchema),
    ])
);

const conditionOperatorEnum = z.enum([
  "equals",
  "notEquals",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "startsWith",
]);

const variableConditionSchema = z.object({
  variable: z.string(),
  operator: conditionOperatorEnum,
  value: jsonValueSchema,
});

/** All trigger actions validated from section/content JSON, including 3D element actions. */
export const triggerActionSchema: z.ZodType<PeblorAction> = z.discriminatedUnion("type", [
  // Core actions
  z.object({
    type: z.literal("contentOverride"),
    payload: z.object({ key: z.string(), value: jsonValueSchema }),
  }),
  z.object({
    type: z.literal("backgroundSwitch"),
    payload: z.union([z.string(), z.record(z.string(), z.unknown())]),
  }),
  z.object({
    type: z.literal("startTransition"),
    payload: z.object({ id: z.string() }),
  }),
  z.object({
    type: z.literal("stopTransition"),
    payload: z.object({ id: z.string() }),
  }),
  z.object({
    type: z.literal("updateTransitionProgress"),
    payload: z.object({
      id: z.string(),
      progress: z.number().optional(),
      invert: z.boolean().optional(),
    }),
  }),
  // Navigation & Back
  z.object({ type: z.literal("back") }),
  z.object({
    type: z.literal("navigate"),
    payload: z.object({ href: z.string(), replace: z.boolean().optional() }),
  }),
  z.object({
    type: z.literal("scrollTo"),
    payload: z
      .object({
        id: z.string().optional(),
        offset: z.number().optional(),
        behavior: z.enum(["smooth", "instant"]).optional(),
        block: z.enum(["start", "center", "end", "nearest"]).optional(),
      })
      .optional(),
  }),
  z.object({
    type: z.literal("scrollLock"),
    payload: z.object({}).optional(),
  }),
  z.object({
    type: z.literal("scrollUnlock"),
    payload: z.object({}).optional(),
  }),
  // Modal
  z.object({ type: z.literal("modalOpen"), payload: z.object({ id: z.string() }) }),
  z.object({
    type: z.literal("modalClose"),
    payload: z.object({ id: z.string().optional() }).optional(),
  }),
  z.object({ type: z.literal("modalToggle"), payload: z.object({ id: z.string() }) }),
  // State & Logic
  z.object({
    type: z.literal("setVariable"),
    payload: z.object({ key: z.string(), value: jsonValueSchema }),
  }),
  z.object({
    type: z.literal("fireMultiple"),
    payload: z.object({
      actions: z.array(lazyTriggerAction),
      mode: z.enum(["parallel", "sequence"]).optional(),
      delayBetween: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal("conditionalAction"),
    payload: z.object({
      // Shorthand single-condition form (backward-compatible)
      variable: z.string().optional(),
      operator: conditionOperatorEnum.optional(),
      value: jsonValueSchema.optional(),
      // Multi-condition form
      conditions: z.array(variableConditionSchema).optional(),
      logic: z.enum(["and", "or"]).optional(),
      // Branches — lazyTriggerAction breaks the circular inference cycle
      then: lazyTriggerAction,
      elseIf: z
        .array(
          z.object({
            conditions: z.array(variableConditionSchema),
            logic: z.enum(["and", "or"]).optional(),
            then: lazyTriggerAction,
          })
        )
        .optional(),
      else: lazyTriggerAction.optional(),
    }),
  }),
  // Element visibility
  z.object({ type: z.literal("elementShow"), payload: z.object({ id: z.string() }) }),
  z.object({ type: z.literal("elementHide"), payload: z.object({ id: z.string() }) }),
  z.object({ type: z.literal("elementToggle"), payload: z.object({ id: z.string() }) }),
  // Media
  z.object({
    type: z.literal("playSound"),
    payload: z.object({
      src: z.string(),
      volume: z.number().optional(),
      loop: z.boolean().optional(),
    }),
  }),
  z.object({
    type: z.literal("stopSound"),
    payload: z.object({ src: z.string().optional() }).optional(),
  }),
  z.object({
    type: z.literal("setVolume"),
    payload: z.object({ volume: z.number(), id: z.string().optional() }),
  }),
  // Browser
  z.object({ type: z.literal("copyToClipboard"), payload: z.object({ text: z.string() }) }),
  z.object({
    type: z.literal("vibrate"),
    payload: z
      .object({ pattern: z.union([z.number(), z.array(z.number())]).optional() })
      .optional(),
  }),
  z.object({ type: z.literal("setDocumentTitle"), payload: z.object({ title: z.string() }) }),
  z.object({
    type: z.literal("openExternalUrl"),
    payload: z.object({ url: z.string(), target: z.string().optional() }),
  }),
  // Analytics
  z.object({
    type: z.literal("trackEvent"),
    payload: z.object({
      event: z.custom<AnalyticsEventKey>(
        (val) =>
          typeof val === "string" &&
          ((ANALYTICS_EVENT_NAMES as readonly string[]).includes(val) || val.startsWith("custom:")),
        { message: 'Event must be a known event name or use "custom:" prefix' }
      ),
      properties: z.record(z.string(), jsonValueSchema).optional(),
    }),
  }),
  // Storage
  z.object({
    type: z.literal("setLocalStorage"),
    payload: z.object({ key: z.string(), value: jsonValueSchema }),
  }),
  z.object({
    type: z.literal("setSessionStorage"),
    payload: z.object({ key: z.string(), value: jsonValueSchema }),
  }),
  // Theme
  z.object({
    type: z.literal("setTheme"),
    payload: z.object({ mode: z.enum(["light", "dark", "toggle"]) }),
  }),
  // 3D element actions
  z.object({ type: z.literal("three.load"), payload: threeBasePayload }),
  z.object({ type: z.literal("three.unload"), payload: threeBasePayload }),
  z.object({ type: z.literal("three.toggleLoaded"), payload: threeBasePayload }),
  z.object({ type: z.literal("three.setVisibility"), payload: threeSetVisibilityPayload }),
  z.object({ type: z.literal("three.fadeIn"), payload: threeFadePayload }),
  z.object({ type: z.literal("three.fadeOut"), payload: threeFadePayload }),
  z.object({ type: z.literal("three.playAnimation"), payload: threeAnimationNamePayload }),
  z.object({ type: z.literal("three.pauseAnimation"), payload: threeAnimationNamePayload }),
  z.object({ type: z.literal("three.toggleAnimation"), payload: threeAnimationNamePayload }),
  z.object({ type: z.literal("three.setAnimation"), payload: threeAnimationNamePayload }),
  z.object({ type: z.literal("three.crossFadeAnimation"), payload: threeCrossFadePayload }),
  z.object({ type: z.literal("three.scrubAnimation"), payload: threeScrubPayload }),
  z.object({ type: z.literal("three.setCameraPreset"), payload: threeCameraPresetPayload }),
  z.object({ type: z.literal("three.nextCameraPreset"), payload: threeCameraPresetPayload }),
  z.object({ type: z.literal("three.resetCamera"), payload: threeBasePayload }),
  z.object({ type: z.literal("three.playVideoTexture"), payload: threeBasePayload }),
  z.object({ type: z.literal("three.pauseVideoTexture"), payload: threeBasePayload }),
  z.object({ type: z.literal("three.toggleVideoTexture"), payload: threeBasePayload }),
  z.object({ type: z.literal("three.setCameraEffectsPreset"), payload: threeCameraPresetPayload }),
  // Transform actions
  z.object({ type: z.literal("three.setPosition"), payload: threeSetPositionPayload }),
  z.object({ type: z.literal("three.translateBy"), payload: threeTranslateByPayload }),
  z.object({ type: z.literal("three.setRotation"), payload: threeSetRotationPayload }),
  z.object({ type: z.literal("three.rotateBy"), payload: threeRotateByPayload }),
  z.object({ type: z.literal("three.setScale"), payload: threeSetScalePayload }),
  z.object({ type: z.literal("three.scaleBy"), payload: threeScaleByPayload }),
  z.object({ type: z.literal("three.resetTransform"), payload: threeBasePayload }),
  z.object({ type: z.literal("three.animateTo"), payload: threeAnimateToPayload }),
  // Continuous loop actions
  z.object({
    type: z.literal("three.startContinuousRotate"),
    payload: threeContinuousRotatePayload,
  }),
  z.object({ type: z.literal("three.stopContinuousRotate"), payload: threeBasePayload }),
  z.object({ type: z.literal("three.startContinuousFloat"), payload: threeContinuousFloatPayload }),
  z.object({ type: z.literal("three.stopContinuousFloat"), payload: threeBasePayload }),
  z.object({ type: z.literal("three.startContinuousScale"), payload: threeContinuousScalePayload }),
  z.object({ type: z.literal("three.stopContinuousScale"), payload: threeBasePayload }),
  // Camera extended
  z.object({ type: z.literal("three.animateCamera"), payload: threeAnimateCameraPayload }),
  z.object({ type: z.literal("three.orbitEnable"), payload: threeOrbitEnablePayload }),
  z.object({ type: z.literal("three.orbitDisable"), payload: threeBasePayload }),
  // Material
  z.object({ type: z.literal("three.setMaterialColor"), payload: threeMaterialColorPayload }),
  z.object({ type: z.literal("three.setMaterialOpacity"), payload: threeMaterialOpacityPayload }),
  z.object({
    type: z.literal("three.setEmissiveIntensity"),
    payload: threeEmissiveIntensityPayload,
  }),
  // Scene
  z.object({ type: z.literal("three.setLightIntensity"), payload: threeLightIntensityPayload }),
  z.object({ type: z.literal("three.setLightColor"), payload: threeLightColorPayload }),
  // Post-processing
  z.object({
    type: z.literal("three.setPostProcessingParam"),
    payload: threePostProcessingParamPayload,
  }),
  z.object({ type: z.literal("three.togglePostEffect"), payload: threeTogglePostEffectPayload }),
  // Asset / media element actions (video, audio controls targeting a specific element)
  z.object({ type: z.literal("assetPlay"), payload: assetPayload }),
  z.object({ type: z.literal("assetPause"), payload: assetPayload }),
  z.object({ type: z.literal("assetTogglePlay"), payload: assetPayload }),
  z.object({
    type: z.literal("assetSeek"),
    payload: z.object({ id: z.string().optional(), time: z.number().optional() }).optional(),
  }),
  z.object({ type: z.literal("assetMute"), payload: assetPayload }),
  z.object({ type: z.literal("videoFullscreen"), payload: assetPayload }),
  // Rive element actions — minimal payload contracts per action
  z.object({ type: z.literal("rive.setInput"), payload: riveSetInputPayload }),
  z.object({ type: z.literal("rive.fireTrigger"), payload: riveInputPayload }),
  z.object({ type: z.literal("rive.play"), payload: riveBasePayload }),
  z.object({ type: z.literal("rive.pause"), payload: riveBasePayload }),
  z.object({ type: z.literal("rive.reset"), payload: riveBasePayload }),
]) as z.ZodType<PeblorAction>;

/** Inferred type from triggerActionSchema. Used for section JSON. */
export type CoreTriggerAction = z.infer<typeof triggerActionSchema>;

const nonEmptyThemeStringValueSchema = z.string().min(1);

export const themeStringObjectSchema = z
  .object({
    value: nonEmptyThemeStringValueSchema.optional(),
    light: nonEmptyThemeStringValueSchema.optional(),
    dark: nonEmptyThemeStringValueSchema.optional(),
  })
  .refine((value) => value.value != null || value.light != null || value.dark != null, {
    message: "Theme string object must include at least one of value, light, or dark",
  });

export const themeStringSchema = z.union([nonEmptyThemeStringValueSchema, themeStringObjectSchema]);

export type ThemeString = z.infer<typeof themeStringSchema>;

export const responsiveThemeStringSchema = z.union([
  themeStringSchema,
  z.tuple([themeStringSchema, themeStringSchema]),
]);

export const cssInlineStyleValueSchema = z.union([themeStringSchema, z.number()]);
export const cssInlineStyleSchema = z.record(z.string(), cssInlineStyleValueSchema);

export const responsiveStringSchema = z.union([z.string(), z.tuple([z.string(), z.string()])]);

/**
 * JSON.parse leaves explicit `null`; Zod `.optional()` only treats `undefined` as absent (SCHEMA-2).
 * Use for optional fields that may be serialized as `null` from CMS or hand-edited JSON.
 */
export function jsonNullishOptional<T extends z.ZodTypeAny>(inner: T) {
  return z.preprocess((v) => (v === null ? undefined : v), inner.optional());
}

const sectionAlignEnum = z.enum(["left", "center", "right", "full"]);
export const responsiveSectionAlignSchema = z.union([
  sectionAlignEnum,
  z.tuple([sectionAlignEnum, sectionAlignEnum]),
]);

const elementAlignEnum = z.enum(["left", "center", "right", "full"]);
export const responsiveElementAlignSchema = z.union([
  elementAlignEnum,
  z.tuple([elementAlignEnum, elementAlignEnum]),
]);

const elementAlignYEnum = z.enum(["top", "center", "bottom"]);
export const responsiveElementAlignYSchema = z.union([
  elementAlignYEnum,
  z.tuple([elementAlignYEnum, elementAlignYEnum]),
]);

export const elementTextAlignSchema = z.enum(["left", "right", "center", "justify"]);
export const responsiveTextAlignSchema = z.union([
  elementTextAlignSchema,
  z.tuple([elementTextAlignSchema, elementTextAlignSchema]),
]);

export const responsiveBooleanSchema = z
  .union([
    z.boolean(),
    z
      .object({
        mobile: z.boolean().optional(),
        desktop: z.boolean().optional(),
      })
      .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
        message: "At least one of mobile or desktop boolean value must be provided",
      }),
  ])
  .optional();

export const referrerPolicySchema = z.enum([
  "no-referrer",
  "no-referrer-when-downgrade",
  "origin",
  "origin-when-cross-origin",
  "same-origin",
  "strict-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url",
]);
