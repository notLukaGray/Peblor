import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { themeStringSchema } from "./schema-primitives";

const tooltipPositionSchema = z.enum(["top", "bottom", "left", "right", "auto"]).optional();
const tooltipTriggerSchema = z.enum(["hover", "click", "focus"]).optional();
const tooltipAnimationSchema = z.enum(["fade", "scale", "slide", "none"]).optional();

export const elementTooltipSchema = z
  .object({
    type: z.literal("elementTooltip"),
    content: z.string(),
    triggerLabel: z.string().optional(),
    position: tooltipPositionSchema,
    trigger: tooltipTriggerSchema,
    showDelay: z.number().nonnegative().optional(),
    hideDelay: z.number().nonnegative().optional(),
    offset: z.string().optional(),
    arrow: z.boolean().optional(),
    interactive: z.boolean().optional(),
    followCursor: z.boolean().optional(),
    maxWidth: z.string().optional(),
    zIndex: z.number().optional(),
    /**
     * Legacy entrance preset when `motion` is omitted. Prefer layout `motion` (Framer Motion JSON)
     * for full control, e.g. `{ "initial": { "opacity": 0 }, "animate": { "opacity": 1, "transition": { "duration": 0.5 } }, "exit": { ... } }`.
     */
    animation: tooltipAnimationSchema,
    color: themeStringSchema.optional(),
    fontFamily: z.string().optional(),
    fontSize: z.union([z.string(), z.number()]).optional(),
    fontWeight: z.union([z.string(), z.number()]).optional(),
    ariaLabel: z.string().optional(),
  })
  .merge(elementLayoutSchema);
