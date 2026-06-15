import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { typographyOverridesSchema } from "./schema-shared-primitives";

/**
 * elementCode — renders a semantic <pre><code> block.
 *
 * `code` is rendered as plain text content — React escapes it, so no
 * dangerouslySetInnerHTML is used. `language` is applied as a
 * `language-<x>` class on the <code> element for downstream CSS highlighters
 * (no syntax-highlighting dependency is added). `wrap` controls white-space.
 * `showLineNumbers` sets a `data-line-numbers` attribute/class only — no
 * numbering engine is included. Typography and layout are inherited from
 * typographyOverridesSchema and elementLayoutSchema.
 */
export const elementCodeSchema = z
  .object({
    type: z.literal("elementCode"),
    /** The raw code string to display. React escapes it — no XSS risk. */
    code: z.string(),
    /** Language identifier (e.g. "typescript", "css"). Adds a `language-<x>` class. */
    language: z.string().optional(),
    /** When true, applies `white-space: pre-wrap`; otherwise `pre`. */
    wrap: z.boolean().optional(),
    /** When true, adds a `data-line-numbers` attribute for CSS-based line-number styling. */
    showLineNumbers: z.boolean().optional(),
  })
  .merge(typographyOverridesSchema)
  .merge(elementLayoutSchema);
