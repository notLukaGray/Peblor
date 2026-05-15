import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { formFieldBlockSchema } from "./form-field-schemas";

export const elementFormFieldSchema = z
  .object({
    type: z.literal("elementFormField"),
    field: formFieldBlockSchema,
  })
  .merge(elementLayoutSchema);
