import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { jsonNullishOptional, themeStringSchema } from "./schema-primitives";

const marqueeDirectionSchema = z.enum(["left", "right", "up", "down"]).optional();
const marqueeVariantSchema = jsonNullishOptional(z.enum(["display", "section", "label"]));
const headingLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const elementMarqueeFollowPathSchema = z.object({
  /** SVG path `d` in user units; scaled to the marquee box (see height). */
  d: z.string().min(1),
  /**
   * SVG `textPath` glyph rotation along the path: `auto` (default) rotates each glyph with the
   * path tangent; `0deg` / `0` keeps glyphs upright; other values are passed through as SVG
   * `rotate` (e.g. `12deg` → tangent + 12°).
   */
  offsetRotate: z.string().optional(),
  /** CSS height of the motion viewport; path is fitted to this box. */
  height: z.string().optional(),
});

export const elementMarqueeSchema = z
  .object({
    type: z.literal("elementMarquee"),
    text: z.string().optional(),
    variableKey: z.string().optional(),
    direction: marqueeDirectionSchema,
    speed: z.number().positive().optional(),
    gap: z.string().optional(),
    pauseOnHover: z.boolean().optional(),
    pauseOnFocus: z.boolean().optional(),
    gradientEdges: z.boolean().optional(),
    gradientWidth: z.string().optional(),
    gradientColor: themeStringSchema.optional(),
    autoFill: z.boolean().optional(),
    reverseOnEnd: z.boolean().optional(),
    duplicateContent: z.boolean().optional(),
    /** Heading scale (native outline uses role=heading elsewhere on the page). */
    level: headingLevelSchema.optional(),
    /** Body-style scale when `level` is omitted (display / section / label). */
    variant: marqueeVariantSchema,
    fontFamily: z.string().optional(),
    fontSize: z.union([z.string(), z.number()]).optional(),
    fontWeight: z.union([z.string(), z.number()]).optional(),
    letterSpacing: z.union([z.string(), z.number()]).optional(),
    color: themeStringSchema.optional(),
    textFill: z
      .union([
        z.object({ type: z.literal("color"), value: themeStringSchema }),
        z.object({ type: z.literal("gradient"), value: themeStringSchema }),
      ])
      .optional(),
    /** Motion along an SVG path (CSS motion path). Linear translate marquee when omitted. */
    followPath: elementMarqueeFollowPathSchema.optional(),
  })
  .merge(elementLayoutSchema);
