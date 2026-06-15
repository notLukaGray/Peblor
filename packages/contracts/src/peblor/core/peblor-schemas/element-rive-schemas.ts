import { z } from "zod";
import { elementLayoutSchema, elementVideoObjectFitSchema } from "./element-foundation-schemas";
import { responsiveValueSchema } from "./responsive-value-schemas";
import {
  responsiveStringSchema,
  themeStringSchema,
  triggerActionSchemaCore,
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

const responsiveRiveObjectFitSchema = responsiveValueSchema(elementVideoObjectFitSchema).optional();

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
    onStateChange: triggerActionSchemaCore.optional(),
    onPlay: triggerActionSchemaCore.optional(),
    onPause: triggerActionSchemaCore.optional(),
    onComplete: triggerActionSchemaCore.optional(),
    onLoop: triggerActionSchemaCore.optional(),
    onStop: triggerActionSchemaCore.optional(),
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
