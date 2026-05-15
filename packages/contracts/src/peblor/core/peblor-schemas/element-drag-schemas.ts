import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { responsiveStringSchema } from "./schema-primitives";

const dragAxisSchema = z.enum(["x", "y", "both"]).optional();
const dragSnapSchema = z
  .object({
    x: z.number().optional(),
    y: z.number().optional(),
  })
  .optional();

const dragBoundsSchema = z
  .object({
    left: z.number().optional(),
    top: z.number().optional(),
    right: z.number().optional(),
    bottom: z.number().optional(),
  })
  .optional();

const dragInertiaSchema = z
  .object({
    mass: z.number().positive().optional(),
    stiffness: z.number().positive().optional(),
    damping: z.number().positive().optional(),
  })
  .optional();

export const elementDragSchema = z
  .object({
    type: z.literal("elementDrag"),
    axis: dragAxisSchema,
    snap: dragSnapSchema,
    bounds: dragBoundsSchema,
    inertia: dragInertiaSchema,
    dragCssClass: z.string().optional(),
    dragOpacity: z.number().min(0).max(1).optional(),
    snapBack: z.boolean().optional(),
    snapBackDuration: z.number().positive().optional(),
    constrainToParent: z.boolean().optional(),
    dragThreshold: z.number().nonnegative().optional(),
    children: z
      .object({
        elementOrder: z.array(z.string()).optional(),
        definitions: z.record(z.string(), z.object({ type: z.string() }).passthrough()),
      })
      .optional(),
    ariaLabel: z.string().optional(),
    dragHandleWidth: responsiveStringSchema.optional(),
    dragHandleHeight: responsiveStringSchema.optional(),
  })
  .merge(elementLayoutSchema);
