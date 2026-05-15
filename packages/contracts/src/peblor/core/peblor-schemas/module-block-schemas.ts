import { z } from "zod";
import { MOTION_DEFAULTS } from "../peblor-motion-defaults";
import { motionPropsSchema } from "./motion-props-schema";
import { cssInlineStyleSchema } from "./schema-primitives";
import { peblorMetaSchema } from "./figma-exporter-meta-schema";
import { sectionEffectSchema } from "./section-effect-schemas";

const lazySlotElementBlock: z.ZodType<unknown> = z.lazy(() =>
  z.object({ type: z.string() }).passthrough()
);

const responsiveElementOrderSchema = z.union([
  z.array(z.string()),
  z.object({
    mobile: z.array(z.string()),
    desktop: z.array(z.string()),
  }),
]);

const moduleSlotSectionSchema = z
  .object({
    elementOrder: responsiveElementOrderSchema.optional(),
    definitions: z.record(z.string(), lazySlotElementBlock).optional(),
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
    zIndex: z.number().optional(),
    display: z.string().optional(),
    flexDirection: z.string().optional(),
    alignItems: z.string().optional(),
    justifyContent: z.string().optional(),
    gap: z.string().optional(),
    flexWrap: z.enum(["nowrap", "wrap", "wrap-reverse"]).optional(),
    rowGap: z.union([z.string(), z.number()]).optional(),
    columnGap: z.union([z.string(), z.number()]).optional(),
    padding: z.string().optional(),
    section: moduleSlotSectionSchema.optional(),
    action: z.string().optional(),
    visibleWhen: z.union([z.literal("always"), z.array(z.string())]).optional(),
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
      .optional()
      .default(MOTION_DEFAULTS.transition.duration * 1000),
    elementRevealMs: z
      .number()
      .nonnegative()
      .optional()
      .default(MOTION_DEFAULTS.transition.duration * 1000),
    elementRevealStaggerMs: z
      .number()
      .min(0)
      .optional()
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
      })
      .passthrough()
      .optional(),
    /** How slot inherits parent motion transform: "inherit" | "disable" | "follow". Default "inherit". */
    transformInherit: z.enum(["inherit", "disable", "follow"]).optional(),
    /** Generic visual effects for the slot surface, including glass. */
    effects: z.array(sectionEffectSchema).optional(),
    style: cssInlineStyleSchema.optional(),
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
        aspectRatio: z.string().optional(),
      })
      .optional(),
    behavior: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
    /** Keyboard shortcuts for the player. key matches KeyboardEvent.code (e.g. "Space", "ArrowLeft"). */
    keyBindings: z
      .array(
        z.object({
          key: z.string(),
          action: z.string(),
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
