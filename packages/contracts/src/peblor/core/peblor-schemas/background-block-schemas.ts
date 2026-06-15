import { z } from "zod";
import {
  themeStringSchema,
  themeStringOrGradientSchema,
  triggerActionSchemaCore,
} from "./schema-primitives";
import { bgLayerMotionSchema } from "./background-motion-schemas";
import { progressRangeSchema } from "./schema-shared-primitives";

export { bgLayerMotionSchema };
export type { BgLayerMotion, BgLoopMotion } from "../../background/motion/bg-layer-motion-types";

export const bgVarLayerSchema = z.object({
  fill: themeStringOrGradientSchema,
  blendMode: z.string().optional(),
  opacity: z.number().optional(),
  /**
   * Passed directly as the CSS `background-size` property.
   * Required for moving gradient effects — e.g. "400% 400%" gives the gradient
   * room to pan without repeating.
   */
  backgroundSize: z.string().optional(),
  /**
   * Initial `background-position` value. Overridden at runtime by `parallax` motion.
   */
  backgroundPosition: z.string().optional(),
  /**
   * CSS `background-repeat` value for this layer.
   */
  backgroundRepeat: z.string().optional(),
  /**
   * Ordered array of motion configs that animate this layer.
   * Multiple types compose additively — e.g. loop + scroll + trigger can all
   * run simultaneously on the same layer. See bgLayerMotionSchema for full docs.
   */
  motion: z.array(bgLayerMotionSchema).optional(),
});

export const bgPatternRepeatSchema = z.enum([
  "repeat",
  "repeat-x",
  "repeat-y",
  "no-repeat",
  "space",
  "round",
]);

const bgBlockSchemaBase: z.ZodTypeAny = z.lazy(() => bgBlockSchema);

export const bgBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("backgroundVideo"),
    video: z.string(),
    poster: z.string().optional(),
    /** CSS color overlay on top of the video (e.g. #00000080, oklch(), color-mix()). */
    overlay: themeStringSchema.optional(),
  }),
  z.object({
    type: z.literal("backgroundImage"),
    image: z.string(),
    /** CSS `background-size` (e.g. "cover", "contain", "100% 100%"). Defaults to "cover". */
    backgroundSize: z.string().optional(),
    /** CSS `background-position` (e.g. "center", "top left", "50% 25%"). Defaults to "center". */
    backgroundPosition: z.string().optional(),
    /** CSS `background-repeat` (e.g. "no-repeat", "repeat", "repeat-x"). Defaults to "no-repeat". */
    backgroundRepeat: z
      .enum(["repeat", "repeat-x", "repeat-y", "no-repeat", "space", "round"])
      .optional(),
    /**
     * CSS `background-attachment` — controls whether the background scrolls with the page.
     * - `"scroll"` (default): background moves with the element
     * - `"fixed"`: background is fixed relative to the viewport (parallax/CSS-native effect)
     * - `"local"`: background scrolls with the element's own scroll box
     */
    backgroundAttachment: z.enum(["scroll", "fixed", "local"]).optional(),
    /** CSS color overlay rendered on top of the image (e.g. #00000080, oklch(), color-mix()). */
    overlay: themeStringSchema.optional(),
  }),
  z.object({
    type: z.literal("backgroundVariable"),
    layers: z.array(bgVarLayerSchema),
  }),
  z.object({
    type: z.literal("backgroundPattern"),
    image: z.string(),
    repeat: bgPatternRepeatSchema.optional(),
  }),
  z
    .object({
      type: z.literal("backgroundTransition"),
      from: bgBlockSchemaBase,
      to: bgBlockSchemaBase,
      duration: z.number().positive().optional(),
      easing: z.string().optional(),
      mode: z.enum(["progress", "time"]).optional(),
      trigger: triggerActionSchemaCore.optional(),
      time: z.number().nonnegative().optional(),
      position: z.union([z.number(), z.string()]).optional(),
      progress: z.number().min(0).max(1).optional(),
      progressRange: progressRangeSchema.optional(),
    })
    .refine(
      (data) => {
        const mode = data.mode ?? (data.progressRange ? "progress" : "time");
        if (mode === "time" && !data.duration) return false;
        return true;
      },
      {
        message: "duration is required when mode is 'time'",
        path: ["duration"],
      }
    ),
]);

/** Describes a transition between two background definitions, keyed by background definition IDs. */
export const backgroundTransitionEffectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TIME"),
    id: z.string().min(1),
    from: z.string(),
    to: z.string(),
    duration: z.number().positive(),
    easing: z.string().optional(),
  }),
  z.object({
    type: z.literal("TRIGGER"),
    id: z.string().min(1),
    from: z.string(),
    to: z.string(),
    duration: z.number().positive(),
    easing: z.string().optional(),
  }),
  z.object({
    type: z.literal("SCROLL"),
    id: z.string().min(1),
    from: z.string(),
    to: z.string(),
    source: z.enum(["page", "trigger"]).optional(),
    progress: z.number().min(0).max(1).optional(),
    progressRange: progressRangeSchema.optional(),
  }),
]);

/** Discriminant strings for bgBlockSchema — single source of truth for bg type guards. */
export const BG_BLOCK_TYPE_STRINGS: readonly string[] = bgBlockSchema.options.map(
  (opt) => (opt as z.ZodObject<{ type: z.ZodLiteral<string> }>).shape.type.value
);
