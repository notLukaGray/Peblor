import { z } from "zod";
import {
  jsonNullishOptional,
  responsiveStringSchema,
  themeStringSchema,
} from "./schema-primitives";
import { sectionEffectSchema } from "./section-effect-schemas";

// ---------------------------------------------------------------------------
// borderGradientSchema — shared by both element borderSchema and the
// mutual-exclusion refine in elementLayoutSchema. Moved here from
// element-foundation-schemas.ts so consumers can import from either path.
// ---------------------------------------------------------------------------

export const borderGradientSchema = z.object({
  stroke: themeStringSchema,
  width: z.union([z.string(), z.number()]),
});

// ---------------------------------------------------------------------------
// spacingSchema — margin/padding fields shared by elements and sections.
// ---------------------------------------------------------------------------

export const spacingSchema = z.object({
  marginTop: jsonNullishOptional(responsiveStringSchema),
  marginBottom: jsonNullishOptional(responsiveStringSchema),
  marginLeft: jsonNullishOptional(responsiveStringSchema),
  marginRight: jsonNullishOptional(responsiveStringSchema),
  margin: jsonNullishOptional(responsiveStringSchema),
  padding: jsonNullishOptional(responsiveStringSchema),
  paddingTop: jsonNullishOptional(responsiveStringSchema),
  paddingRight: jsonNullishOptional(responsiveStringSchema),
  paddingBottom: jsonNullishOptional(responsiveStringSchema),
  paddingLeft: jsonNullishOptional(responsiveStringSchema),
});

// ---------------------------------------------------------------------------
// borderSchema — border, borderGradient, borderRadius, outline fields.
// borderGradientSchema is defined above in this same file.
// ---------------------------------------------------------------------------

export const borderSchema = z.object({
  borderGradient: jsonNullishOptional(borderGradientSchema),
  border: jsonNullishOptional(responsiveStringSchema),
  borderTop: jsonNullishOptional(responsiveStringSchema),
  borderRight: jsonNullishOptional(responsiveStringSchema),
  borderBottom: jsonNullishOptional(responsiveStringSchema),
  borderLeft: jsonNullishOptional(responsiveStringSchema),
  borderRadius: jsonNullishOptional(responsiveStringSchema),
  outline: jsonNullishOptional(responsiveStringSchema),
});

// ---------------------------------------------------------------------------
// overflowClipSchema — overflow/overflow-x/overflow-y axis controls and
// clip-path. Shared by elements and sections.
// ---------------------------------------------------------------------------

export const overflowClipSchema = z.object({
  scroll: jsonNullishOptional(z.enum(["hidden", "visible", "auto", "scroll"])),
  scrollX: jsonNullishOptional(z.enum(["hidden", "visible", "auto", "scroll", "clip"])),
  scrollY: jsonNullishOptional(z.enum(["hidden", "visible", "auto", "scroll", "clip"])),
  clipShape: jsonNullishOptional(z.string()),
});

// ---------------------------------------------------------------------------
// scrollSnapSchema — scroll-snap container vocabulary and scrollbar styling.
// Element-only (not currently used by section schemas), but exported for
// potential section reuse.
// ---------------------------------------------------------------------------

export const scrollSnapSchema = z.object({
  scrollSnapType: jsonNullishOptional(z.string()),
  scrollSnapAlign: jsonNullishOptional(
    z.enum(["none", "start", "end", "center", "start end", "start center", "end center"])
  ),
  scrollSnapStop: jsonNullishOptional(z.enum(["normal", "always"])),
  scrollPadding: jsonNullishOptional(z.string()),
  scrollbarWidth: jsonNullishOptional(z.enum(["auto", "thin", "none"])),
  scrollbarColor: jsonNullishOptional(themeStringSchema),
  scrollbarGutter: jsonNullishOptional(z.enum(["auto", "stable", "stable both-edges"])),
  overscrollBehavior: jsonNullishOptional(z.string()),
  scrollMarginTop: jsonNullishOptional(z.union([z.string(), z.number()])),
});

// ---------------------------------------------------------------------------
// effectsSchema — visual-effects fields (box-shadow, filters, opacity,
// blend-mode, rotate/flip, transform, text decoration, etc.).
// ---------------------------------------------------------------------------

export const effectsSchema = z.object({
  boxShadow: jsonNullishOptional(z.string()),
  filter: jsonNullishOptional(z.string()),
  bgBlur: jsonNullishOptional(z.string()),
  opacity: jsonNullishOptional(z.number().min(0).max(1)),
  blendMode: jsonNullishOptional(z.string()),
  effects: jsonNullishOptional(z.array(sectionEffectSchema)),
  rotate: jsonNullishOptional(z.union([z.number(), z.string()])),
  flipHorizontal: jsonNullishOptional(z.boolean()),
  flipVertical: jsonNullishOptional(z.boolean()),
  transform: jsonNullishOptional(z.string()),
  transformOrigin: jsonNullishOptional(z.string()),
  mask: jsonNullishOptional(z.string()),
  willChange: jsonNullishOptional(z.string()),
  textShadow: jsonNullishOptional(z.string()),
  textDecoration: jsonNullishOptional(z.string()),
  textTransform: jsonNullishOptional(z.string()),
  whiteSpace: jsonNullishOptional(z.enum(["normal", "nowrap", "pre", "pre-wrap", "pre-line"])),
});
