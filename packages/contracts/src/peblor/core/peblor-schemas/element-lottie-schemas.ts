import { z } from "zod";
import { elementLayoutSchema, elementVideoObjectFitSchema } from "./element-foundation-schemas";
import { responsiveValueSchema } from "./responsive-value-schemas";
import {
  responsiveStringSchema,
  themeStringSchema,
  triggerActionSchemaCore,
} from "./schema-primitives";

const lottiePlayModeSchema = z.enum(["normal", "bounce", "reverse"]).optional();
const lottieRendererSchema = z.enum(["svg", "canvas", "html"]).optional();
const lottieInteractivityEventSchema = z.enum([
  "complete",
  "loopComplete",
  "enterFrame",
  "segmentEnter",
  "segmentExit",
  "DOMLoaded",
  "destroy",
  "data_ready",
]);

const responsiveLottieObjectFitSchema = responsiveValueSchema(
  elementVideoObjectFitSchema
).optional();

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
          action: triggerActionSchemaCore,
        })
      )
      .optional(),
    themeOverrides: z.record(z.string(), themeStringSchema).optional(),
    onPlay: triggerActionSchemaCore.optional(),
    onPause: triggerActionSchemaCore.optional(),
    onStop: triggerActionSchemaCore.optional(),
    onComplete: triggerActionSchemaCore.optional(),
    onLoop: triggerActionSchemaCore.optional(),
    onEnterFrame: triggerActionSchemaCore.optional(),
    onEvent: z
      .array(
        z.object({
          event: z.string(),
          actions: z.array(triggerActionSchemaCore),
        })
      )
      .optional(),
    ariaLabel: z.string().optional(),
  })
  .merge(elementLayoutSchema);
