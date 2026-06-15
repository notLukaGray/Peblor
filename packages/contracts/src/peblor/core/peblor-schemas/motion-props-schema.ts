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
  "textUnderlineOffset",
  // layout
  "gap",
  "flex",
  "gridTemplateColumns",
  // SVG / masking
  "maskImage",
  // per-property transition override (valid inside from/to/leave)
  "transition",
]);

/**
 * Keys managed by peblor's layout system — rejected in entrance/exit keyframes (C-11)
 * to prevent silent stripping at runtime. Gesture keyframes (onHover, etc.) may still
 * use a subset of these (width, height) via the base motionKeyframesSchema.
 */
const PB_LAYOUT_KEYS = new Set([
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
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderWidth",
  "borderStyle",
  "boxShadow",
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

/**
 * Entrance/exit keyframes — additionally rejects layout-owned keys (C-11).
 * Use this for from, to, leave, and states. Gesture keyframes
 * (onHover, etc.) use the more permissive motionKeyframesSchema.
 */
const entranceMotionKeyframesSchema = z
  .record(z.string(), motionKeyframesValueSchema)
  .superRefine((kf, ctx) => {
    for (const key of Object.keys(kf)) {
      if (key.startsWith("--")) continue; // CSS custom property escape hatch
      if (PB_LAYOUT_KEYS.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Layout-owned key "${key}" is managed by peblor's layout system. Use the corresponding layout field instead of motion keyframes.`,
        });
        continue;
      }
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
  type: z.enum(["spring", "ease", "momentum"]).optional(),
  stiffness: z.number().optional(),
  damping: z.number().optional(),
  mass: z.number().optional(),
  // "Infinity" string is the JSON-safe way to express repeat: Infinity (JS number).
  // Zod transform coerces it to the JS Infinity value at parse time.
  repeat: z
    .union([z.number().min(0), z.literal("Infinity")])
    .transform((v) => (v === "Infinity" ? Infinity : v))
    .optional(),
  repeatType: z.enum(["loop", "reverse", "mirror"]).optional(),
  repeatDelay: z.number().min(0).optional(),
  times: z.array(z.number().min(0).max(1)).optional(),
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
    from: entranceMotionKeyframesSchema,
    to: entranceMotionKeyframesSchema,
    leave: entranceMotionKeyframesSchema,
    transition: motionTransitionSchema,
  })
  .optional();

export type MotionState = z.infer<typeof motionStateSchema>;

/** Fully resolved entrance animation config injected by the server pipeline at build time. */
export const resolvedEntranceMotionSchema = z.object({
  from: z.record(z.string(), z.unknown()),
  to: z.record(z.string(), z.unknown()),
  transition: z.record(z.string(), z.unknown()),
  viewportAmount: z.number(),
  viewportOnce: z.boolean(),
  onHover: z.record(z.string(), z.unknown()).optional(),
  onPress: z.record(z.string(), z.unknown()).optional(),
});

export type ResolvedEntranceMotion = z.infer<typeof resolvedEntranceMotionSchema>;

/** Fully resolved exit animation config injected by the server pipeline at build time. */
export const resolvedExitMotionSchema = z.object({
  leave: z.record(z.string(), z.unknown()),
  transition: z.record(z.string(), z.unknown()).optional(),
});

export type ResolvedExitMotion = z.infer<typeof resolvedExitMotionSchema>;

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
    /** Injected by the server pipeline. Never set in content JSON. */
    resolvedExitMotion: resolvedExitMotionSchema.optional(),
    /** Seconds between each child's entrance when used on an elementGroup parent. */
    staggerChildren: z.number().min(0).optional(),
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
    type: z.enum(["momentum", "spring", "ease"]).optional(),
    power: z.number().optional(),
    timeConstant: z.number().optional(),
    bounceStiffness: z.number().optional(),
    bounceDamping: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .optional();

const variantEntrySchema = z.object({
  from: entranceMotionKeyframesSchema,
  to: entranceMotionKeyframesSchema,
  leave: entranceMotionKeyframesSchema,
  transition: motionTransitionSchema,
});

export const inheritModeSchema = z.enum(["auto", "inherit", "isolate"]).optional();

export const motionPropsSchema = z
  .object({
    from: entranceMotionKeyframesSchema,
    to: entranceMotionKeyframesSchema,
    leave: entranceMotionKeyframesSchema,
    transition: motionTransitionSchema,
    initialVariant: z.string().optional(),
    animateVariant: z.string().optional(),
    exitVariant: z.string().optional(),
    states: z.record(z.string(), variantEntrySchema).optional(),

    inheritMode: inheritModeSchema,
    inherit: z.boolean().optional(),

    motionTiming: motionTimingSchema.optional(),
    onVisible: z.union([motionKeyframesSchema, z.string()]).optional(),
    viewport: viewportSchema.optional(),
    onHover: z.union([motionKeyframesSchema, z.string()]).optional(),
    onPress: z.union([motionKeyframesSchema, z.string()]).optional(),
    onFocus: z.union([motionKeyframesSchema, z.string()]).optional(),
    onDrag: z.union([motionKeyframesSchema, z.string()]).optional(),
    hoverExitDelayMs: z.number().min(0).max(5000).optional(),
    /** Continuous loop animation — merged into to with repeat: Infinity. Separates entrance from looping. */
    loop: z
      .object({
        to: entranceMotionKeyframesSchema,
        /** Loop transition overrides. */
        transition: baseTransitionSchema.optional(),
      })
      .optional(),
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

// ─── Deferred motion features (gap 1.9) ────────────────────────────────────
// These are known gaps documented in agents/peblor-gaps.md §1.9. They are
// intentionally NOT implemented yet — tracking here so the schema contract
// can be extended in a focused PR when each feature is ready.
//
// 1. scroll-linked element animation primitive on arbitrary elements
//    (sections have scrollOpacityRange + bg layers have scroll motion; an element
//     cannot currently say "scale 0.8→1 over scroll range" declaratively).
//    Would need: a new `scrollMapping` field on motionTimingSchema (or on the
//    element base) that maps scroll progress → keyframe values, analogous to
//    section-scroll-progress-bar but per-element.
//
// 2. staggerDirection / delayChildren
//    motionTimingSchema has `staggerChildren` (seconds) but no directional
//    variant (forward vs reverse stagger) and no `delayChildren` to offset
//    the first child independently of the stagger interval.
//
// 3. onViewEnter / onViewLeave motion variants dispatch
//    onVisible exists but fires a variant string on-enter-only with no
//    leave counterpart. Would need a `viewportCallbacks` or similar field
//    on motionTimingSchema for "enterVariant" / "leaveVariant" that the
//    runtime dispatches via useInView.
// ────────────────────────────────────────────────────────────────────────────
