import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { typographyOverridesSchema } from "./schema-shared-primitives";

/**
 * elementTable — renders a semantic <table>.
 *
 * `headers` produces a <thead><tr> with <th> cells. `rows` produces a
 * <tbody> with one <tr> per inner array. `columnAlign` maps per-column
 * text-align values onto both header and body cells. Typography and layout
 * are inherited from typographyOverridesSchema and elementLayoutSchema.
 */
export const elementTableSchema = z
  .object({
    type: z.literal("elementTable"),
    /** Optional <caption> rendered above the table body. */
    caption: z.string().optional(),
    /** Header row — each string becomes a <th> in a <thead><tr>. */
    headers: z.array(z.string()).optional(),
    /** Body rows — each inner array is a <tr> of <td> cells. */
    rows: z.array(z.array(z.string())),
    /** Per-column text alignment applied to matching <th>/<td> cells. */
    columnAlign: z.array(z.enum(["left", "center", "right"])).optional(),
  })
  .merge(typographyOverridesSchema)
  .merge(elementLayoutSchema);
