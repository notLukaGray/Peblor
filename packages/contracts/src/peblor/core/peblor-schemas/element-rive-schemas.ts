import { z } from "zod";
import { elementLayoutSchema, elementVideoObjectFitSchema } from "./element-foundation-schemas";
import {
  responsiveStringSchema,
  themeStringSchema,
  triggerActionSchema,
} from "./schema-primitives";

const rivePlayModeSchema = z.enum(["normal", "bounce", "reverse"]).optional();
const riveInteractivityEventSchema = z.enum([
  "load",
  "stateChange",
  "click",
  "hoverEnter",
  "hoverLeave",
  "pointerDown",
  "pointerUp",
]);

const responsiveRiveObjectFitSchema = z
  .union([
    elementVideoObjectFitSchema,
    z.tuple([elementVideoObjectFitSchema, elementVideoObjectFitSchema]),
  ])
  .optional();

export const elementRiveSchema = z
  .object({
    type: z.literal("elementRive"),
    src: z.string(),
    poster: z.string().optional(),
    artboard: z.string().optional(),
    stateMachine: z.string().optional(),
    autoplay: z.boolean().optional(),
    loop: z.union([z.boolean(), z.number().int().nonnegative()]).optional(),
    speed: z.number().positive().optional(),
    playMode: rivePlayModeSchema,
    backgroundColor: themeStringSchema.optional(),
    preserveAspectRatio: z.string().optional(),
    objectFit: responsiveRiveObjectFitSchema,
    aspectRatio: responsiveStringSchema.optional(),
    hover: z.boolean().optional(),
    interactivity: z
      .array(
        z.object({
          event: riveInteractivityEventSchema,
          input: z.string(),
          value: z.unknown().optional(),
        })
      )
      .optional(),
    onStateChange: triggerActionSchema.optional(),
    onPlay: triggerActionSchema.optional(),
    onPause: triggerActionSchema.optional(),
    onComplete: triggerActionSchema.optional(),
    onLoop: triggerActionSchema.optional(),
    onStop: triggerActionSchema.optional(),
    ariaLabel: z.string().optional(),
  })
  .merge(elementLayoutSchema);
