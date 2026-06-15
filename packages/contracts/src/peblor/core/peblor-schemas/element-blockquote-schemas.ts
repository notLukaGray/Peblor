import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { typographyOverridesSchema } from "./schema-shared-primitives";

/**
 * elementBlockquote — renders a semantic <blockquote>.
 *
 * The quote body is in `text`. When `attribution` is set it is rendered in a
 * <footer><cite> below the quote. Typography and layout are inherited from
 * typographyOverridesSchema and elementLayoutSchema.
 */
export const elementBlockquoteSchema = z
  .object({
    type: z.literal("elementBlockquote"),
    /** The quote body text (required). */
    text: z.string(),
    /** Source URL for the <blockquote cite> attribute (optional). */
    cite: z.string().optional(),
    /** Attribution text rendered in a <footer><cite> (e.g. author, source). */
    attribution: z.string().optional(),
  })
  .merge(typographyOverridesSchema)
  .merge(elementLayoutSchema);
