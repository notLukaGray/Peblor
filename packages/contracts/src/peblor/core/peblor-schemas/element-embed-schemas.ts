import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { jsonNullishOptional } from "./schema-primitives";
import { referrerPolicySchema } from "./schema-shared-primitives";

/**
 * elementEmbed — renders an <iframe> for external embeds:
 * YouTube, Vimeo, Google Maps, Spotify, CodePen, etc.
 *
 * Security-relevant fields:
 *   - sandbox: restrict iframe capabilities (e.g. "allow-scripts allow-same-origin")
 *   - referrerPolicy: control the Referer header sent with the request
 *   - allow: Permissions Policy string (e.g. "autoplay; fullscreen; picture-in-picture")
 *
 * Layout is inherited from elementLayoutSchema (includes aspectRatio, width, height, etc.).
 */
export const elementEmbedSchema = z
  .object({
    type: z.literal("elementEmbed"),
    /** The iframe src URL (required). */
    src: z.string(),
    /** Accessible label for the iframe — maps to the HTML title attribute. */
    title: z.string().optional(),
    /** Permissions Policy string e.g. "autoplay; fullscreen; picture-in-picture". */
    allow: z.string().optional(),
    /** Maps to the iframe allowfullscreen attribute. */
    allowFullScreen: z.boolean().optional(),
    /** Resource loading strategy. Defaults to "lazy" at render time. */
    loading: z.enum(["eager", "lazy"]).optional(),
    /** Referrer policy for the iframe request. */
    referrerPolicy: jsonNullishOptional(referrerPolicySchema),
    /** Sandbox token list restricting iframe capabilities e.g. "allow-scripts allow-same-origin". */
    sandbox: z.string().optional(),
  })
  .merge(elementLayoutSchema);
