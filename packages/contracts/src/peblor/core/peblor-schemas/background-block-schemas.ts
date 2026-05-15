import { z } from "zod";
import { themeStringSchema, triggerActionSchema } from "./schema-primitives";
import { bgLayerMotionSchema } from "../../background/motion/bg-layer-motion-schema";

export { bgLayerMotionSchema };
export type { BgLayerMotion } from "../../background/motion/bg-layer-motion-types";

export const bgVarLayerSchema = z.object({
  fill: themeStringSchema,
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
   * Ordered array of motion configs that animate this layer.
   * Multiple types compose additively — e.g. loop + scroll + trigger can all
   * run simultaneously on the same layer. See bgLayerMotionSchema for full docs.
   */
  motion: z.array(bgLayerMotionSchema).optional(),
});

export const bgPatternRepeatSchema = z.enum(["repeat", "repeat-x", "repeat-y", "no-repeat"]);

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
      trigger: triggerActionSchema.optional(),
      time: z.number().nonnegative().optional(),
      position: z.union([z.number(), z.string()]).optional(),
      progress: z.number().min(0).max(1).optional(),
      progressRange: z
        .object({
          start: z.number().min(0).max(1),
          end: z.number().min(0).max(1),
        })
        .refine((range) => range.start < range.end, {
          message: "progressRange.start must be less than progressRange.end",
        })
        .optional(),
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
