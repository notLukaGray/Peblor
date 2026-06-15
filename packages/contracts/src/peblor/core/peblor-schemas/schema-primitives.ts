import { z } from "zod";
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

/**
 * rive.play / rive.pause / rive.reset payload.
 * Intentionally `z.record(z.string(), z.unknown())` — no required keys; animationName is optional
 * and the Rive runtime accepts arbitrary extension fields. Typed loosely because the real shape
 * varies per Rive file and action. If a specific field is needed by a new action, add a new
 * narrowly-typed payload schema like riveSetInputPayload or riveInputPayload.
 */
const riveBasePayload = z.record(z.string(), z.unknown()).optional();

/**
 * Payload for asset/media element actions (assetPlay, assetPause, assetMute, videoFullscreen, etc.).
 * Intentionally `z.record(z.string(), z.unknown())` — the media dispatcher reads `id` (target
 * element), `time` (seek), `volume`, and other heterogeneous fields depending on the action.
 * The `assetSeek` variant uses a narrower typed payload; all other asset actions remain loose
 * because no additional structure is currently required by the runtime.
 * Tighten individual actions by adding a typed variant (like assetSeek) if required fields emerge.
 */
const assetPayload = z.record(z.string(), z.unknown()).optional();

// Self-referential lazy stub — used in conditionalAction's then/else/branch fields.
// Typed as ZodTypeAny to break the circular inference cycle; runtime shape is identical
// to triggerActionSchemaCore (they refer to the same object after initialisation).
const lazyTriggerAction: z.ZodTypeAny = z.lazy(() => triggerActionSchemaCore);

import {
  conditionGroupSchema,
  conditionOperatorSchema,
  jsonValueSchema,
  variableConditionSchema,
} from "./schema-shared-primitives";

const conditionOperatorEnum = conditionOperatorSchema;

const conditionBlockSchema = z
  .object({
    variable: z.string().optional(),
    operator: conditionOperatorEnum.optional(),
    value: jsonValueSchema.optional(),
    conditions: z.array(z.union([variableConditionSchema, conditionGroupSchema])).optional(),
    logic: z.enum(["and", "or"]).optional(),
  })
  .optional();

/**
 * All trigger action variants. Exported as an array so consumers can compose
 * discriminated unions without re-importing individual schemas.
 */
export const TRIGGER_ACTION_CORE_VARIANTS = [
  // Core actions
  z.object({
    type: z.literal("contentOverride"),
    payload: z.object({ key: z.string(), value: jsonValueSchema }),
  }),
  // backgroundSwitch payload is a string key (most common) or an inline bg-block
  // record. The record shape is validated separately by bgBlockSchema wherever
  // bg blocks appear; keeping it loose here breaks the circular dep with
  // background-block-schemas.ts.
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
  z.object({ type: z.literal("back"), payload: z.undefined().optional() }),
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
    type: z.literal("incrementVariable"),
    payload: z.object({ key: z.string(), by: z.number().optional() }),
  }),
  z.object({
    type: z.literal("toggleVariable"),
    payload: z.object({
      key: z.string(),
      values: z.tuple([jsonValueSchema, jsonValueSchema]),
    }),
  }),
  z.object({
    type: z.literal("deleteVariable"),
    payload: z.object({ key: z.string() }),
  }),
  z.object({
    type: z.literal("readLocalStorage"),
    payload: z.object({ key: z.string(), as: z.string().optional() }),
  }),
  z.object({
    type: z.literal("readSessionStorage"),
    payload: z.object({ key: z.string(), as: z.string().optional() }),
  }),
  z.object({
    type: z.literal("readUrlParam"),
    payload: z.object({
      param: z.string(),
      as: z.string().optional(),
      parse: z.enum(["string", "number", "boolean", "json"]).optional(),
    }),
  }),
  z.object({
    type: z.literal("waitFor"),
    payload: z.object({
      variable: z.string().optional(),
      operator: conditionOperatorEnum.optional(),
      value: jsonValueSchema.optional(),
      conditions: z.array(z.union([variableConditionSchema, conditionGroupSchema])).optional(),
      logic: z.enum(["and", "or"]).optional(),
      timeout: z.number().optional(),
      onTimeout: lazyTriggerAction.optional(),
      then: lazyTriggerAction.optional(),
    }),
  }),
  z.object({
    type: z.literal("computeVariable"),
    payload: z.union([
      // Arithmetic — left/right operands
      z.object({
        key: z.string(),
        operation: z.enum(["add", "subtract", "multiply", "divide", "modulo"]),
        left: z.union([z.string(), z.number()]),
        right: z.union([z.string(), z.number()]),
      }),
      // Unary — from only, no extra fields (normalised to accept string | number)
      z.object({
        key: z.string(),
        operation: z.enum([
          "length",
          "keys",
          "values",
          "abs",
          "floor",
          "ceil",
          "round",
          "not",
          "toNumber",
          "toString",
          "toBoolean",
          "min",
          "max",
          "upper",
          "lower",
          "trim",
        ]),
        from: z.union([z.string(), z.number()]),
      }),
      // Clamp — from + bounds
      z.object({
        key: z.string(),
        operation: z.literal("clamp"),
        from: z.union([z.string(), z.number()]),
        min: z.number(),
        max: z.number(),
      }),
      // Concat — parts array
      z.object({
        key: z.string(),
        operation: z.literal("concat"),
        parts: z.array(z.union([z.string(), z.number()])),
      }),
      // From-based ops with op-specific fields — merged with superRefine
      z
        .object({
          key: z.string(),
          operation: z.enum(["slice", "join", "split", "arrayIndex", "format", "replace"]),
          from: z.union([z.string(), z.number()]),
          start: z.number().optional(),
          end: z.number().optional(),
          separator: z.string().optional(),
          by: z.string().optional(),
          index: z.number().optional(),
          template: z.string().optional(),
          search: z.string().optional(),
          replacement: z.string().optional(),
          replaceAll: z.boolean().optional(),
        })
        .superRefine((data, ctx) => {
          switch (data.operation) {
            case "slice":
              if (data.start === undefined) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: ["start"],
                  message: "start is required for slice operation",
                });
              }
              break;
            case "split":
              if (data.by === undefined) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: ["by"],
                  message: "by is required for split operation",
                });
              }
              break;
            case "arrayIndex":
              if (data.index === undefined) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: ["index"],
                  message: "index is required for arrayIndex operation",
                });
              }
              break;
            case "format":
              if (data.template === undefined) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: ["template"],
                  message: "template is required for format operation",
                });
              }
              break;
            case "replace":
              if (data.search === undefined) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: ["search"],
                  message: "search is required for replace operation",
                });
              }
              if (data.replacement === undefined) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: ["replacement"],
                  message: "replacement is required for replace operation",
                });
              }
              break;
          }
        }),
    ]),
  }),
  z.object({
    type: z.literal("fetchApi"),
    payload: z.object({
      url: z.string(),
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
      headers: z.record(z.string(), z.string()).optional(),
      body: jsonValueSchema.optional(),
      responseKey: z.string(),
      responsePath: z.string().optional(),
      errorKey: z.string().optional(),
      statusKey: z.string().optional(),
      debounceMs: z.number().optional(),
      cancelKey: z.string().optional(),
      retries: z.number().int().nonnegative().optional(),
      retryDelay: z.number().nonnegative().optional(),
      onSuccess: lazyTriggerAction.optional(),
      onError: lazyTriggerAction.optional(),
    }),
  }),
  z.object({
    type: z.literal("fireMultiple"),
    payload: z.object({
      actions: z.array(lazyTriggerAction),
      mode: z.enum(["parallel", "sequence"]).optional(),
      delayBetween: z.number().optional(),
      breakIf: conditionBlockSchema,
    }),
  }),
  z.object({
    type: z.literal("conditionalAction"),
    payload: z
      .object({
        // Shorthand single-condition form (backward-compatible, normalised at parse time)
        variable: z.string().optional(),
        operator: conditionOperatorEnum.optional(),
        value: jsonValueSchema.optional(),
        // Multi-condition form
        conditions: z.array(z.union([variableConditionSchema, conditionGroupSchema])).optional(),
        logic: z.enum(["and", "or"]).optional(),
        // Branches — lazyTriggerAction breaks the circular inference cycle
        then: lazyTriggerAction,
        elseIf: z
          .array(
            z.object({
              conditions: z.array(z.union([variableConditionSchema, conditionGroupSchema])),
              logic: z.enum(["and", "or"]).optional(),
              then: lazyTriggerAction,
            })
          )
          .optional(),
        else: lazyTriggerAction.optional(),
      })
      .transform((p) => {
        // Normalise shorthand single-condition into full conditions[] form
        const { variable, operator, value, ...rest } = p;
        if (
          variable !== undefined &&
          operator !== undefined &&
          (!rest.conditions || rest.conditions.length === 0)
        ) {
          return {
            ...rest,
            conditions: [{ variable, operator, value: value ?? null }],
            logic: rest.logic ?? "and",
          };
        }
        return rest;
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
      volume: z.number().min(0).max(1).optional(),
      loop: z.boolean().optional(),
    }),
  }),
  z.object({
    type: z.literal("stopSound"),
    payload: z.object({ src: z.string().optional() }).optional(),
  }),
  z.object({
    type: z.literal("setVolume"),
    payload: z.object({ volume: z.number().min(0).max(1), id: z.string().optional() }),
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
  z.object({ type: z.literal("assetNext"), payload: assetPayload }),
  z.object({ type: z.literal("assetPrev"), payload: assetPayload }),
  z.object({
    type: z.literal("assetSeek"),
    payload: z.object({ id: z.string().optional(), time: z.number().optional() }).optional(),
  }),
  z.object({ type: z.literal("assetMute"), payload: assetPayload }),
  z.object({ type: z.literal("videoFullscreen"), payload: assetPayload }),
  // Generic fullscreen (any element, not just video)
  z.object({ type: z.literal("fullscreenElement"), payload: z.object({ id: z.string() }) }),
  // Preload an asset into the browser cache
  z.object({
    type: z.literal("preloadAsset"),
    payload: z.object({
      src: z.string(),
      type: z.enum(["image", "video", "audio", "font"]).optional(),
    }),
  }),
  // Rive element actions — minimal payload contracts per action
  z.object({ type: z.literal("rive.setInput"), payload: riveSetInputPayload }),
  z.object({ type: z.literal("rive.fireTrigger"), payload: riveInputPayload }),
  z.object({ type: z.literal("rive.play"), payload: riveBasePayload }),
  z.object({ type: z.literal("rive.pause"), payload: riveBasePayload }),
  z.object({ type: z.literal("rive.reset"), payload: riveBasePayload }),
  // Extended state management
  z.object({
    type: z.literal("setVariablePath"),
    payload: z.object({ path: z.string(), value: jsonValueSchema }),
  }),
  z.object({
    type: z.literal("appendToArray"),
    payload: z.object({ key: z.string(), value: jsonValueSchema }),
  }),
  z.object({
    type: z.literal("removeFromArray"),
    payload: z.object({
      key: z.string(),
      index: z.number().optional(),
      where: z
        .object({ path: z.string(), operator: conditionOperatorEnum, value: jsonValueSchema })
        .optional(),
    }),
  }),
  z.object({
    type: z.literal("mergeVariable"),
    payload: z.object({ key: z.string(), value: z.record(z.string(), jsonValueSchema) }),
  }),
  // Event bus
  z.object({
    type: z.literal("dispatchCustomEvent"),
    payload: z.object({ name: z.string(), detail: jsonValueSchema.optional() }),
  }),
  // Timer control
  z.object({
    type: z.literal("cancelTimer"),
    payload: z.object({ id: z.string() }),
  }),
  // Control flow
  z.object({
    type: z.literal("repeatAction"),
    payload: z.object({
      count: z.number().int().min(1),
      action: lazyTriggerAction,
      delayMs: z.number().optional(),
    }),
  }),
  // Fetch lifecycle
  z.object({
    type: z.literal("abortFetch"),
    payload: z.object({ cancelKey: z.string() }),
  }),
  // DOM / style
  z.object({
    type: z.literal("setCssVariable"),
    payload: z.object({ property: z.string(), value: z.string(), selector: z.string().optional() }),
  }),
  z.object({ type: z.literal("focusElement"), payload: z.object({ id: z.string() }) }),
  z.object({ type: z.literal("blurElement"), payload: z.object({ id: z.string() }) }),
  // Focus trap — constrain keyboard focus within a subtree
  z.object({ type: z.literal("setFocusTrap"), payload: z.object({ id: z.string() }) }),
  // Release focus trap — restore focus to the trigger element
  z.object({
    type: z.literal("releaseFocusTrap"),
    payload: z.object({ id: z.string().optional() }).optional(),
  }),
  z.object({
    type: z.literal("setInputValue"),
    payload: z.object({ id: z.string(), value: z.string() }),
  }),
  // Toast notification
  z.object({
    type: z.literal("showToast"),
    payload: z.object({
      message: z.string(),
      variant: z.enum(["info", "success", "error", "warning"]).optional(),
      durationMs: z.number().optional(),
    }),
  }),
  // URL manipulation
  z.object({
    type: z.literal("setUrlParam"),
    payload: z.object({ param: z.string(), value: z.string(), replace: z.boolean().optional() }),
  }),
  // HTML media element control
  z.object({ type: z.literal("elementPlay"), payload: z.object({ id: z.string() }) }),
  z.object({ type: z.literal("elementPause"), payload: z.object({ id: z.string() }) }),
  z.object({
    type: z.literal("elementSeek"),
    payload: z.object({ id: z.string(), time: z.number() }),
  }),
  // Browser share (Web Share API)
  z.object({
    type: z.literal("share"),
    payload: z
      .object({
        title: z.string().optional(),
        text: z.string().optional(),
        url: z.string().optional(),
        files: z.array(z.string()).optional(),
      })
      .optional(),
  }),
  // Programmatic file download
  z.object({
    type: z.literal("downloadFile"),
    payload: z.object({
      url: z.string(),
      filename: z.string().optional(),
    }),
  }),
  // Compute: now / timestamp
  z.object({
    type: z.literal("computeNow"),
    payload: z.object({
      key: z.string(),
      format: z.enum(["timestamp", "iso", "date", "time", "datetime"]).optional(),
      locale: z.string().optional(),
    }),
  }),
  // Compute: random
  z.object({
    type: z.literal("computeRandom"),
    payload: z.object({
      key: z.string(),
      min: z.number().optional(),
      max: z.number().optional(),
      integer: z.boolean().optional(),
    }),
  }),
] as const;

/**
 * Pre-built payload schema lookup for validateActionPayload.
 * Maps action type strings to their Zod payload schemas (or undefined for no-payload types).
 * Built from TRIGGER_ACTION_CORE_VARIANTS at module scope so the full 55-variant
 * discriminated union is never re-parsed during superRefine validation — only the
 * matching variant's payload schema is used.
 */
const ACTION_PAYLOAD_MAP = new Map<string, z.ZodTypeAny | undefined>();
const VALID_ACTION_TYPES = new Set<string>();

for (const variant of TRIGGER_ACTION_CORE_VARIANTS) {
  const actionType: string = variant.shape.type.value;
  VALID_ACTION_TYPES.add(actionType);
  const shape = variant.shape as Record<string, z.ZodTypeAny | undefined>;
  ACTION_PAYLOAD_MAP.set(actionType, shape.payload);
}

/**
 * All trigger actions, including backgroundSwitch.
 *
 * The inferred type is the canonical PeblorAction union.  Recursive payload fields
 * (onTimeout, then, onSuccess, onError, action) infer as `any` because the
 * circular `lazyTriggerAction` reference is typed as z.ZodTypeAny to break the
 * inference cycle.  Runtime code accessing these fields casts with `as PeblorAction`.
 *
 * Previously this was annotated `z.ZodType<PeblorAction>` with PeblorAction
 * maintained by hand in trigger-action-types.ts.  Now PeblorAction is derived
 * from this schema — see CoreTriggerAction below.
 */
export const triggerActionSchemaCore = z.discriminatedUnion("type", [
  ...TRIGGER_ACTION_CORE_VARIANTS,
]);

/** @deprecated Use triggerActionSchemaCore. Kept for import compatibility. */
export const triggerActionSchema = triggerActionSchemaCore;

export type CoreTriggerAction = z.infer<typeof triggerActionSchemaCore>;

/**
 * Shared action+payload validator used by both elementLayoutSchemaBase (base layout)
 * and elementButtonSchema. When an element's `action` field is set, this validates that
 * the corresponding `actionPayload` satisfies the canonical Zod payload schema for that
 * action type. Extracts the logic from elementButton's superRefine so the two schemas
 * share ONE implementation rather than duplicating it.
 */
export function validateActionPayload(
  action: string,
  actionPayload: unknown,
  ctx: z.RefinementCtx
): void {
  // Unknown action type — should not happen with validated data, but match the
  // discriminated union behavior of rejecting unknown types.
  if (!VALID_ACTION_TYPES.has(action)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["actionPayload"],
      message: `Unknown action type "${action}"`,
    });
    return;
  }

  const payloadSchema = ACTION_PAYLOAD_MAP.get(action);

  // No payload field in this variant's schema — the current discriminated union
  // parse strips unknown keys (Zod default), so any payload is silently accepted.
  // Matching that behavior here: no validation needed.
  if (payloadSchema === undefined) {
    return;
  }

  // Single-variant safeParse: validates the payload directly against its type's
  // schema, avoiding re-dispatch through the full 55-way discriminated union.
  const result = payloadSchema.safeParse(actionPayload);
  if (!result.success) {
    const details = result.error.issues.map((i) => i.message).join("; ");
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["actionPayload"],
      message: `actionPayload does not match the expected shape for action "${action}": ${details}`,
    });
  }
}

// Shared primitives moved to schema-shared-primitives.ts — re-exported here to keep
// existing imports working without changes.
export * from "./schema-shared-primitives";
