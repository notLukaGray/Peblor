import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { responsiveStringSchema } from "./schema-primitives";
// B-4 / C-15: Cannot import elementBlockSchema from element-block-schemas.ts directly
// (that file imports this one, creating a circular dep). Instead, import the shared lazy
// ref from lazy-element-ref.ts, which is populated by element-block-schemas.ts after init.
import { lazyElementBlock } from "./lazy-element-ref";

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
        /** Lazy element block ref — fully typed via shared lazy ref (B-4). */
        definitions: z.record(z.string(), lazyElementBlock),
      })
      .optional(),
    ariaLabel: z.string().optional(),
    dragHandleWidth: responsiveStringSchema.optional(),
    dragHandleHeight: responsiveStringSchema.optional(),
  })
  .merge(elementLayoutSchema);
