import { z } from "zod";
import { elementLayoutSchema, elementVideoObjectFitSchema } from "./element-foundation-schemas";
import {
  responsiveStringSchema,
  themeStringSchema,
  triggerActionSchema,
} from "./schema-primitives";

const lottiePlayModeSchema = z.enum(["normal", "bounce", "reverse"]).optional();
const lottieRendererSchema = z.enum(["svg", "canvas", "html"]).optional();
const lottieInteractivityEventSchema = z.enum([
  "complete",
  "loopComplete",
  "enterFrame",
  "DOMLoaded",
  "destroy",
  "data_ready",
]);

const responsiveLottieObjectFitSchema = z
  .union([
    elementVideoObjectFitSchema,
    z.tuple([elementVideoObjectFitSchema, elementVideoObjectFitSchema]),
  ])
  .optional();

export const elementLottieSchema = z
  .object({
    type: z.literal("elementLottie"),
    src: z.string(),
    poster: z.string().optional(),
    autoplay: z.boolean().optional(),
    loop: z.union([z.boolean(), z.number().int().nonnegative()]).optional(),
    speed: z.number().positive().optional(),
    direction: z.union([z.literal(1), z.literal(-1)]).optional(),
    playMode: lottiePlayModeSchema,
    segment: z.tuple([z.number(), z.number()]).optional(),
    renderer: lottieRendererSchema,
    backgroundColor: themeStringSchema.optional(),
    preserveAspectRatio: z.string().optional(),
    objectFit: responsiveLottieObjectFitSchema,
    aspectRatio: responsiveStringSchema.optional(),
    hover: z.boolean().optional(),
    interactivity: z
      .array(
        z.object({
          event: lottieInteractivityEventSchema,
          action: triggerActionSchema,
        })
      )
      .optional(),
    themeOverrides: z.record(z.string(), themeStringSchema).optional(),
    onPlay: triggerActionSchema.optional(),
    onPause: triggerActionSchema.optional(),
    onStop: triggerActionSchema.optional(),
    onComplete: triggerActionSchema.optional(),
    onLoop: triggerActionSchema.optional(),
    onEnterFrame: triggerActionSchema.optional(),
    ariaLabel: z.string().optional(),
  })
  .merge(elementLayoutSchema);
