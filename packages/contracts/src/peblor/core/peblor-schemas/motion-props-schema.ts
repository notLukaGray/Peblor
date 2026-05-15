import { z } from "zod";
import { ENTRANCE_PRESET_NAMES, EXIT_PRESET_NAMES } from "../peblor-motion-defaults";

const motionKeyframesValueSchema = z.union([
  z.number(),
  z.string(),
  z.array(z.number()),
  // per-property transition override: { duration, ease, delay, ... }
  z.record(z.string(), z.unknown()),
]);

/**
 * Known Framer Motion animatable properties.
 * CSS custom properties (--*) are always allowed as an escape hatch.
 */
const KNOWN_FM_KEYFRAME_KEYS = new Set([
  // transforms
  "x",
  "y",
  "z",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "scale",
  "scaleX",
  "scaleY",
  "skew",
  "skewX",
  "skewY",
  "translateX",
  "translateY",
  "translateZ",
  "perspective",
  "transformPerspective",
  "originX",
  "originY",
  "originZ",
  // opacity & visibility
  "opacity",
  "visibility",
  // colors
  "color",
  "backgroundColor",
  "borderColor",
  "fill",
  "stroke",
  "fillOpacity",
  "strokeOpacity",
  // dimensions & position
  "width",
  "height",
  "maxWidth",
  "maxHeight",
  "minWidth",
  "minHeight",
  "top",
  "left",
  "right",
  "bottom",
  "margin",
  "padding",
  // border
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderWidth",
  "borderStyle",
  // stroke (SVG)
  "strokeWidth",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeLinecap",
  // path (SVG)
  "pathLength",
  "pathOffset",
  "pathSpacing",
  // filters
  "filter",
  "backdropFilter",
  "WebkitBackdropFilter",
  "blur",
  "brightness",
  "contrast",
  "saturate",
  "grayscale",
  "invert",
  "sepia",
  // layout & appearance
  "boxShadow",
  "textShadow",
  "outline",
  "clipPath",
  "backgroundSize",
  "backgroundPosition",
  "cursor",
  "zIndex",
  // text
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textDecoration",
  // per-property transition override (valid inside initial/animate/exit)
  "transition",
]);

const motionKeyframesSchema = z
  .record(z.string(), motionKeyframesValueSchema)
  .superRefine((kf, ctx) => {
    for (const key of Object.keys(kf)) {
      if (key.startsWith("--")) continue; // CSS custom property escape hatch
      if (!KNOWN_FM_KEYFRAME_KEYS.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Unknown motion keyframe property "${key}". Use a known FM property or a CSS custom property (--*).`,
        });
      }
    }
  })
  .optional();

const baseTransitionSchema = z.object({
  duration: z.number().optional(),
  delay: z.number().optional(),
  ease: z.union([z.string(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),
  type: z.enum(["spring", "tween", "inertia"]).optional(),
  stiffness: z.number().optional(),
  damping: z.number().optional(),
  mass: z.number().optional(),
});

const layoutTransitionSchema = baseTransitionSchema.optional();

const motionTransitionSchema = baseTransitionSchema
  .extend({ layout: layoutTransitionSchema })
  .optional();

const viewportSchema = z
  .object({
    once: z.boolean().optional(),
    amount: z.union([z.number().min(0).max(1), z.enum(["some", "all"])]).optional(),
    margin: z.string().optional(),

    playOffset: z.number().min(0).max(1).optional(),
  })
  .optional();

export const motionTriggerSchema = z.enum([
  "onMount",
  "onFirstVisible",
  "onEveryVisible",
  "onTrigger",
]);

/** When exit animations run relative to presence / viewport (see ElementExitWrapper). */
export const motionExitTriggerSchema = z.enum(["manual", "leaveViewport"]);

const motionStateSchema = z
  .object({
    initial: motionKeyframesSchema,
    animate: motionKeyframesSchema,
    exit: motionKeyframesSchema,
    transition: motionTransitionSchema,
  })
  .optional();

export type MotionState = z.infer<typeof motionStateSchema>;

/** Fully resolved entrance animation config injected by the server pipeline at build time. */
export const resolvedEntranceMotionSchema = z.object({
  initial: z.record(z.string(), z.unknown()),
  animate: z.record(z.string(), z.unknown()),
  transition: z.record(z.string(), z.unknown()),
  viewportAmount: z.number(),
  viewportOnce: z.boolean(),
  whileHover: z.record(z.string(), z.unknown()).optional(),
  whileTap: z.record(z.string(), z.unknown()).optional(),
});

export type ResolvedEntranceMotion = z.infer<typeof resolvedEntranceMotionSchema>;

export const motionTimingSchema = z
  .object({
    trigger: motionTriggerSchema.optional(),
    viewport: viewportSchema.optional(),
    /** How `ElementExitWrapper` decides `show` (manual prop vs leave-viewport). */
    exitTrigger: motionExitTriggerSchema.optional(),
    /** Intersection options when `exitTrigger` is `leaveViewport` (e.g. negative margin = exit before fully off-screen). */
    exitViewport: viewportSchema.optional(),
    entrancePreset: z.enum(ENTRANCE_PRESET_NAMES).optional(),
    exitPreset: z.enum(EXIT_PRESET_NAMES).optional(),
    entranceMotion: motionStateSchema,
    exitMotion: motionStateSchema,
    /** Injected by the server pipeline. Never set in content JSON. */
    resolvedEntranceMotion: resolvedEntranceMotionSchema.optional(),
  })
  .optional();

export type MotionTiming = z.infer<typeof motionTimingSchema>;

const dragConstraintsSchema = z
  .union([
    z.literal("parent"),
    z.object({
      left: z.number().optional(),
      right: z.number().optional(),
      top: z.number().optional(),
      bottom: z.number().optional(),
    }),
  ])
  .optional();

const dragTransitionSchema = z
  .object({
    type: z.enum(["inertia", "spring", "tween"]).optional(),
    power: z.number().optional(),
    timeConstant: z.number().optional(),
    bounceStiffness: z.number().optional(),
    bounceDamping: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .optional();

const variantEntrySchema = z.object({
  initial: motionKeyframesSchema,
  animate: motionKeyframesSchema,
  exit: motionKeyframesSchema,
  transition: motionTransitionSchema,
});

export const inheritModeSchema = z.enum(["auto", "inherit", "isolate"]).optional();

export const motionPropsSchema = z
  .object({
    initial: motionKeyframesSchema,
    animate: motionKeyframesSchema,
    exit: motionKeyframesSchema,
    transition: motionTransitionSchema,
    initialVariant: z.string().optional(),
    animateVariant: z.string().optional(),
    exitVariant: z.string().optional(),
    variants: z.record(z.string(), variantEntrySchema).optional(),
    layout: z.boolean().optional(),
    layoutId: z.string().nullable().optional(),
    layoutDependency: z.union([z.string(), z.number()]).optional(),
    layoutScroll: z.boolean().optional(),
    layoutRoot: z.boolean().optional(),

    inheritMode: inheritModeSchema,
    inherit: z.boolean().optional(),

    motionTiming: motionTimingSchema.optional(),
    whileInView: z.union([motionKeyframesSchema, z.string()]).optional(),
    viewport: viewportSchema.optional(),
    whileHover: z.union([motionKeyframesSchema, z.string()]).optional(),
    whileTap: z.union([motionKeyframesSchema, z.string()]).optional(),
    whileFocus: z.union([motionKeyframesSchema, z.string()]).optional(),
    whileDrag: z.union([motionKeyframesSchema, z.string()]).optional(),
    drag: z.union([z.boolean(), z.enum(["x", "y"])]).optional(),
    dragConstraints: dragConstraintsSchema.optional(),
    dragElastic: z.number().min(0).max(1).optional(),
    dragMomentum: z.boolean().optional(),
    dragTransition: dragTransitionSchema.optional(),
    dragSnapToOrigin: z.boolean().optional(),
    dragDirectionLock: z.boolean().optional(),
    dragPropagation: z.boolean().optional(),
    /** Pass-through data available inside variant resolver functions. */
    custom: z.unknown().optional(),
    /** When true, element still affects layout during AnimatePresence exit. */
    presenceAffectsLayout: z.boolean().optional(),
  })
  .optional();

export type MotionPropsFromJson = NonNullable<z.infer<typeof motionPropsSchema>>;
