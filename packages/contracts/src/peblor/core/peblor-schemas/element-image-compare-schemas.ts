import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { responsiveStringSchema, themeStringSchema } from "./schema-primitives";

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
        definitions: z.record(z.string(), z.unknown()),
      })
      .optional(),
    ariaLabel: z.string().optional(),
  })
  .merge(elementLayoutSchema);
