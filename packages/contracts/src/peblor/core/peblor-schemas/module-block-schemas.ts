import { z } from "zod";
import { MOTION_DEFAULTS } from "../peblor-motion-defaults";
import { motionPropsSchema } from "./motion-props-schema";
import { cssInlineStyleSchema, jsonNullishOptional } from "./schema-primitives";
import { conditionOperatorSchema, jsonValueSchema } from "./schema-shared-primitives";
import { peblorMetaSchema } from "./figma-exporter-meta-schema";
import { sectionEffectSchema } from "./section-effect-schemas";
import { lazyElementBlock, presetReferenceSchema } from "./element-block-schemas";
import { elementOrderSchema } from "./section-column-layout-schemas";

// B-4 audit: this file contains 5 .passthrough() calls. Decision per schema:
//
// 1. moduleSlotSectionSchema.passthrough() — KEPT. Intentional forward-compat: the
//    section sub-object inside a slot may carry undocumented runtime flags from the
//    content pipeline (e.g. resolved definition keys). Closed set is unknown.
//
// 2. moduleSlotSchema.passthrough() — KEPT. All previously undocumented runtime fields
//    (gestures, feedbackSlot, feedbackMap, feedbackChromeStyle, feedbackDurationMs,
//    layoutMode, layoutModeWhen) are now declared explicitly below (P1.2 follow-up).
//    Passthrough is retained because the slot field surface is still expanding —
//    new context adapters may add slot-specific fields not yet enumerated here.
//
// 3. moduleBlockSchema.passthrough() — KEPT. No undeclared keys found in content yet,
//    but moduleBlock is the extensibility point for new contextType adapters. Passthrough
//    is intentional for forward-compat.
//
// 4. container.passthrough() — KEPT. `background` and `posterGradient` are read by
//    ElementAudio (lines 250, 308) but are not in the declared container field list.
//    These are now declared explicitly; passthrough retained for future extension fields.
//
// 5. wrapperMotion.passthrough() — KEPT. The explicit fields cover all current content
//    usage, but wrapperMotion is intentionally extensible (accepts arbitrary FM keyframe
//    maps). Passthrough is the correct posture.
//
// --- Design-level note: why .passthrough() vs the page schema's `extensions` field ---
//
// The page schema (peblorSchema) uses a structured `extensions: Record<string, unknown>`
// field for forward-compatible brand/tool-specific metadata. This is appropriate because
// the page object is the outermost container — extra fields are tooling artifacts, not
// lifecycle data consumed by the runtime pipeline.
//
// Module schemas use .passthrough() instead because the unknown keys serve fundamentally
// different purposes that an `extensions` namespace cannot capture:
//   - Runtime data injection: the content pipeline stamps resolved keys onto the
//     moduleSlotSection sub-object (e.g., inline definition refs). This data arrives
//     after schema validation, so `extensions` at the top level wouldn't help.
//   - Framer Motion keyframes: wrapperMotion intentionally accepts arbitrary FM
//     keyframe maps (whileHover, whileTap, etc.) — setting these via an `extensions`
//     indirection would add a cumbersome nesting requirement.
//   - Future context adapters: moduleBlock is the extensibility point for new
//     contextType values (video, image, model3d, audio, plus future types). New
//     adapters may need container-level fields not yet enumerated.
//   - Sub-object passthrough: container, wrapperMotion, moduleSlotSection all need
//     passthrough at their own level, not the top level. A single `extensions` field
//     on moduleBlock cannot cover sub-object extension needs.
//
// Both strategies are intentional; they serve different extension points in the
// schema tree. The B-4 per-schema rationale above justifies each individual call.

/**
 * Module slot visibleWhen accepts both:
 * 1. The old array format: `["assetPaused"]` or `"always"` (used by video/audio player slot visibility)
 * 2. The new object format: `{ variable, operator, value, conditions }` (generic variable conditions)
 */
const moduleSlotVisibleWhenSchema = jsonNullishOptional(
  z.union([
    z.literal("always"),
    z.array(z.string()),
    z.object({
      variable: jsonNullishOptional(z.string()),
      operator: jsonNullishOptional(conditionOperatorSchema),
      value: jsonNullishOptional(jsonValueSchema),
      conditions: jsonNullishOptional(
        z.array(
          z.object({
            variable: z.string(),
            operator: conditionOperatorSchema,
            value: jsonValueSchema,
          })
        )
      ),
      logic: jsonNullishOptional(z.enum(["and", "or"])),
    }),
  ])
);

const moduleSlotSectionSchema = z
  .object({
    elementOrder: elementOrderSchema,
    definitions: z
      .record(z.string(), z.union([presetReferenceSchema, lazyElementBlock]))
      .optional(),
  })
  .passthrough();

export const moduleSlotSchema = z
  .object({
    position: z.string().optional(),
    inset: z.string().optional(),
    top: z.string().optional(),
    left: z.string().optional(),
    right: z.string().optional(),
    bottom: z.string().optional(),
    layer: z.number().optional(),
    display: z.string().optional(),
    flow: z.string().optional(),
    align: z.string().optional(),
    distribute: z.string().optional(),
    gap: z.string().optional(),
    wrap: z.enum(["nowrap", "wrap", "wrap-reverse"]).optional(),
    rowGap: z.union([z.string(), z.number()]).optional(),
    columnGap: z.union([z.string(), z.number()]).optional(),
    padding: z.string().optional(),
    section: moduleSlotSectionSchema.optional(),
    action: z.string().optional(),
    /**
     * Gesture handlers for the slot: singleTap, doubleTap with optional region (left/center/right).
     * Each gesture entry: { gesture, region?, action, payload?, feedbackType? }
     * Consumed by the video/audio player gesture dispatcher in ElementModule.
     */
    gestures: z
      .array(
        z.object({
          gesture: z.enum(["doubleTap", "hold", "singleTap"]),
          region: z.string().optional(),
          action: z.enum([
            "assetPlay",
            "assetPause",
            "assetTogglePlay",
            "assetMute",
            "videoFullscreen",
            "assetSeek",
          ]),
          payload: z.number().optional(),
          feedbackType: z.string().optional(),
        })
      )
      .optional(),
    /**
     * When true, this slot acts as the feedback display slot (tap icon overlay).
     * The runtime routes showFeedback() results here instead of a generic layer.
     */
    feedbackSlot: z.boolean().optional(),
    /**
     * Maps feedback type strings (e.g. "seekBack", "seekForward", "play", "pause") to
     * icon/label keys for the feedback overlay UI. Read by the feedback slot renderer.
     */
    feedbackMap: z.record(z.string(), z.string()).optional(),
    /**
     * CSS inline style applied to the feedback chrome container (position, size, color, etc.).
     * Read by the feedback slot renderer.
     */
    feedbackChromeStyle: cssInlineStyleSchema.optional(),
    /**
     * How long (ms) the tap-feedback icon remains visible before fading out.
     * Overrides moduleBlock.behavior.feedbackDurationMs for this slot specifically.
     */
    feedbackDurationMs: z.number().nonnegative().optional(),
    /**
     * When set, the slot switches layout mode based on a runtime variable value.
     * Paired with layoutMode — when the variable matches layoutModeWhen, layoutMode is applied.
     */
    layoutModeWhen: z.string().optional(),
    /**
     * Layout mode for this slot: "hug" (content-sized) or "stretch" (fills available space).
     * Applied when layoutModeWhen condition is met, or always when layoutModeWhen is absent.
     */
    layoutMode: z.enum(["hug", "stretch"]).optional(),
    /** Visibility condition based on runtime variable state (C-14). Supports both array format for player state checks and object format for generic variable conditions. */
    visibleWhen: moduleSlotVisibleWhenSchema,
    transition: z
      .object({
        durationMs: z
          .number()
          .nonnegative()
          .default(MOTION_DEFAULTS.transition.duration * 1000),
        easing: z.string().default(MOTION_DEFAULTS.transition.ease),
      })
      .optional(),
    expandDurationMs: z
      .number()
      .nonnegative()
      .default(MOTION_DEFAULTS.transition.duration * 1000),
    elementRevealMs: z
      .number()
      .nonnegative()
      .default(MOTION_DEFAULTS.transition.duration * 1000),
    elementRevealStaggerMs: z
      .number()
      .min(0)
      .default(MOTION_DEFAULTS.transition.staggerDelay * 1000),
    /** Optional full motion config for slot visibility (keyframes + transition). When set, used instead of default opacity 0/1. */
    motion: motionPropsSchema.optional(),
    /** Optional preset name (from framer-motion-presets entrancePresets) for slot visibility keyframes. Ignored when motion is set. */
    visibilityPreset: z.string().optional(),
    /** Optional preset name for stagger reveal item keyframes (entrancePresets). When set, item initial/animate come from preset. */
    revealPreset: z.string().optional(),
    /** When false, slot wrapper does not get default hover/tap/focus gestures (avoids bar expanding and blocking buttons). */
    slotWrapperGestures: z.boolean().optional(),
    /** Gesture keyframes for the slot wrapper (whileHover, whileTap, whileFocus). From JSON only. */
    wrapperMotion: z
      .object({
        whileHover: z.record(z.string(), z.unknown()).optional(),
        whileTap: z.record(z.string(), z.unknown()).optional(),
        whileFocus: z.record(z.string(), z.unknown()).optional(),
        hoverExitDelayMs: z.number().min(0).max(5000).optional(),
      })
      .passthrough()
      .optional(),
    /** How slot inherits parent motion transform: "inherit" | "disable" | "follow". Default "inherit". */
    transformInherit: z.enum(["inherit", "disable", "follow"]).optional(),
    /** Generic visual effects for the slot surface, including glass. */
    effects: z.array(sectionEffectSchema).optional(),
    style: cssInlineStyleSchema.optional(),
    /**
     * Default wrapper style applied to every element within the slot when no per-element
     * wrapperStyle is set. Read by ModuleSlotSection → ModuleSlotContent.
     * Example: `{ width: "44px", height: "44px", alignItems: "center" }`
     */
    defaultWrapperStyle: cssInlineStyleSchema.optional(),
    /** CSS height of the slot wrapper element (e.g. "44px"). */
    height: z.string().optional(),
    /** CSS padding-bottom of the slot wrapper element (e.g. "10px"). Useful for safe-area insets. */
    paddingBottom: z.string().optional(),
  })
  .passthrough();

export const moduleBlockSchema = z
  .object({
    type: z.literal("module"),
    meta: peblorMetaSchema.optional(),
    contextType: z.enum(["video", "image", "model3d", "audio"]).optional(),
    contentSlot: z.string(),
    slots: z.record(z.string(), moduleSlotSchema),
    definitionsRef: z.string().optional(),
    container: z
      .object({
        padding: z.string().optional(),
        borderRadius: z.string().optional(),
        /** CSS aspect-ratio for the module container. Pass null to suppress forced ratio (rely on minHeight). */
        aspectRatio: z.string().nullish(),
        /** Minimum height of the module container — useful for audio modules with no visual area. */
        minHeight: z.string().optional(),
        /**
         * CSS background of the module container (e.g. a color or gradient string).
         * Read by ElementAudio to tint the waveform/poster area.
         */
        background: z.string().optional(),
        /**
         * CSS background string for the poster gradient overlay rendered on top of the container.
         * Read by ElementAudio when the module has no video/image poster.
         */
        posterGradient: z.string().optional(),
      })
      .passthrough()
      .optional(),
    /**
     * Behavioral config for the player runtime. All keys are optional — the runtime
     * falls back to globals defaults when a key is absent.
     *
     * Typed as a concrete object so typos (e.g. "controldTransitionMs") fail validation
     * rather than silently falling through to runtime defaults.
     */
    behavior: z
      .object({
        /** Fade duration for controls visibility (ms). */
        controlsTransitionMs: z.number().nonnegative().optional(),
        /** CSS easing for controls fade. */
        controlsTransitionEasing: z.string().optional(),
        /** Fallback easing when controlsTransitionEasing is absent. */
        transitionEasing: z.string().optional(),
        /** Tap-feedback icon display duration (ms). */
        feedbackDurationMs: z.number().nonnegative().optional(),
        /** Inactivity timeout before controls hide (ms). */
        sleepAfterMs: z.number().nonnegative().optional(),
        /** Fade duration for the sleep transition (ms). */
        sleepFadeMs: z.number().nonnegative().optional(),
      })
      .optional(),
    /**
     * Keyboard shortcuts for the player. key matches KeyboardEvent.code (e.g. "Space", "ArrowLeft").
     *
     * `payload` is typed as `number` only — this is intentional and correct.
     * The only action that uses payload is `assetSeek` (seek offset in seconds, positive or negative).
     * All other actions (assetPlay, assetPause, assetTogglePlay, assetMute, videoFullscreen) ignore
     * payload entirely. If a non-numeric payload were needed for a new action, add a new binding type
     * rather than widening this field, since `getVideoActionHandler` in packages/core/src/internal/
     * element-video-utils.ts explicitly expects `payload: number | undefined`.
     */
    keyBindings: z
      .array(
        z.object({
          key: z.string(),
          action: z.enum([
            "assetPlay",
            "assetPause",
            "assetTogglePlay",
            "assetMute",
            "videoFullscreen",
            "assetSeek",
          ]),
          payload: z.number().optional(),
        })
      )
      .optional(),
    /** Optional Framer Motion config for the overlay container (e.g. controls fade). When omitted, built from behavior (controlsTransitionMs, etc.). */
    overlayMotion: motionPropsSchema,
    /** Generic visual effects for the module surface, including glass. */
    effects: z.array(sectionEffectSchema).optional(),
    style: cssInlineStyleSchema.optional(),
  })
  .passthrough();
