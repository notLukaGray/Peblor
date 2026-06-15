import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { responsiveStringSchema, themeStringSchema } from "./schema-primitives";
// B-4 / C-15: Cannot import elementBlockSchema from element-block-schemas.ts directly
// (that file imports this one, creating a circular dep). Instead, import the shared lazy
// ref from lazy-element-ref.ts, which is populated by element-block-schemas.ts after init.
import { lazyElementBlock } from "./lazy-element-ref";

const compareDirectionSchema = z.enum(["horizontal", "vertical"]).optional();
const handleIconSchema = z.enum(["arrow", "chevron", "grip", "none"]).optional();
const labelPositionSchema = z.enum(["top", "bottom", "overlay"]).optional();

const compareImageSchema = z.object({
  src: z.string(),
  alt: z.string().optional(),
});

export const elementImageCompareSchema = z
  .object({
    type: z.literal("elementImageCompare"),
    before: compareImageSchema,
    after: compareImageSchema,
    initialPosition: z.number().min(0).max(1).optional(),
    direction: compareDirectionSchema,
    beforeLabel: z.string().optional(),
    afterLabel: z.string().optional(),
    labelPosition: labelPositionSchema,
    hoverActivate: z.boolean().optional(),
    keyboardStep: z.number().positive().optional(),
    handleSize: z.string().optional(),
    handleColor: themeStringSchema.optional(),
    handleIcon: handleIconSchema,
    dividerColor: themeStringSchema.optional(),
    dividerWidth: z.string().optional(),
    aspectRatio: responsiveStringSchema.optional(),
    handleElements: z
      .object({
        elementOrder: z.array(z.string()).optional(),
        /** Lazy element block ref — fully typed via shared lazy ref (B-4). */
        definitions: z.record(z.string(), lazyElementBlock),
      })
      .optional(),
    ariaLabel: z.string().optional(),
  })
  .merge(elementLayoutSchema)
  .superRefine((data, ctx) => {
    const he = data.handleElements;
    if (!he) return;
    const defs = he.definitions ?? {};
    const order = he.elementOrder ?? [];
    const defKeys = new Set(Object.keys(defs));
    const orderSet = new Set(order);
    // Flag definitions present but absent from elementOrder (orphaned definitions).
    for (const key of defKeys) {
      if (!orderSet.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `handleElements.definitions key "${key}" is not listed in elementOrder`,
          path: ["handleElements", "definitions", key],
        });
      }
    }
    // Flag elementOrder keys with no matching definition (dangling references).
    for (const key of order) {
      if (!defKeys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `handleElements.elementOrder key "${key}" has no entry in definitions`,
          path: ["handleElements", "elementOrder"],
        });
      }
    }
  });
