import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { typographyOverridesSchema } from "./schema-shared-primitives";

/**
 * elementList — renders a semantic <ul> or <ol> list.
 *
 * Each item in `items` is rendered as a <li>. Typography and layout are
 * inherited from typographyOverridesSchema and elementLayoutSchema respectively.
 */
export const elementListSchema = z
  .object({
    type: z.literal("elementList"),
    /** The list items to render. Each string is rendered as text content of a <li>. */
    items: z.array(z.string()),
    /** When true, renders an <ol>; when false or absent, renders a <ul>. */
    ordered: z.boolean().optional(),
    /** CSS list-style-type value, e.g. "disc", "decimal", "none". */
    markerStyle: z.string().optional(),
    /** The <ol> start attribute — first item value for ordered lists. */
    start: z.number().int().optional(),
  })
  .merge(typographyOverridesSchema)
  .merge(elementLayoutSchema);
