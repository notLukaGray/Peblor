import { z } from "zod";
import { themeStringSchema } from "./schema-primitives";

const booleanishSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes" ||
      normalized === "on"
    ) {
      return true;
    }
    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "no" ||
      normalized === "off"
    ) {
      return false;
    }
  }
  return value;
}, z.boolean());

export const dividerLayerSchema = z.object({
  fill: themeStringSchema.optional(),
  blendMode: z.string().optional(),
  opacity: z.number().optional(),
});

export const sectionBorderSchema = z.object({
  width: z.string().optional(),
  style: z.string().optional(),
  color: themeStringSchema.optional(),
});

export const backdropBlurEffectSchema = z.object({
  type: z.literal("backdropBlur"),
  amount: z.string().optional(),
});
export const glassEffectSchema = z.object({
  type: z.literal("glass"),
  // --- Figma-semantic fields (exported directly from the Figma plugin) ---
  lightIntensity: z.number().min(0).max(1).optional(),
  lightAngle: z.number().optional(),
  refraction: z.number().min(0).max(1).optional(),
  depth: z.number().min(1).optional(),
  dispersion: z.number().min(0).max(1).optional(),
  frost: z.string().optional(),
  splay: z.number().min(0).max(1).optional(),
  mode: z.enum(["standard", "polar", "prominent", "shader"]).optional(),
  overLight: z.boolean().optional(),
  mouseFollow: z.boolean().optional(),
  // --- Figma-computed derived fields (stored for developer reference) ---
  // withLiquidGlassDefaults populates these; they survive Zod so devs can read them in JSON.
  // Not directly wired to physics params — use the Figma-semantic fields above for overrides.
  displacementScale: z.number().min(0).optional(),
  blurAmount: z.number().min(0).optional(),
  saturation: z.number().min(0).optional(),
  aberrationIntensity: z.number().min(0).optional(),
  elasticity: z.number().min(0).max(1).optional(),
  reflection: z.number().min(0).max(1).optional(),
  // --- Physics overrides (developer-facing; take precedence over Figma fields) ---
  bezelType: z.enum(["convex_circle", "convex_squircle", "concave", "lip"]).optional(),
  bezelWidth: z.union([z.number().min(0), z.string()]).optional(),
  glassThickness: z.union([z.number().min(0), z.string()]).optional(),
  // No upper bound on refractiveIndex — Snell's law stays valid for any n≥1.
  refractiveIndex: z.number().min(1).optional(),
  blur: z.union([z.number().min(0), z.string()]).optional(),
  // No upper bounds on the following — SVG filters and displacement have no mathematical ceiling.
  scaleRatio: z.number().min(0.001).optional(),
  // specularOpacity allows >1 to overshoot the specular highlight beyond pure white.
  specularOpacity: z.number().min(0).max(2).optional(),
  specularSaturation: z.number().min(0).optional(),
  magnifyingScale: z.number().min(0).optional(),
  dropShadow: booleanishSchema.optional(),
  // Clip-path for non-rectangular shapes — objectBoundingBox [0,1]×[0,1] SVG path data.
  // Inferred from Figma node geometry at export time; undefined for rectangular shapes.
  clipPath: z.string().optional(),
  clipRule: z.enum(["nonzero", "evenodd"]).optional(),
});
export const dropShadowEffectSchema = z.object({
  type: z.literal("dropShadow"),
  x: z.string().optional(),
  y: z.string().optional(),
  blur: z.string().optional(),
  spread: z.string().optional(),
  color: themeStringSchema.optional(),
});
export const innerShadowEffectSchema = z.object({
  type: z.literal("innerShadow"),
  x: z.string().optional(),
  y: z.string().optional(),
  blur: z.string().optional(),
  spread: z.string().optional(),
  color: themeStringSchema.optional(),
});
export const glowEffectSchema = z.object({
  type: z.literal("glow"),
  blur: z.string().optional(),
  spread: z.string().optional(),
  color: themeStringSchema.optional(),
});
export const opacityEffectSchema = z.object({
  type: z.literal("opacity"),
  value: z.number().optional(),
});
export const blurEffectSchema = z.object({
  type: z.literal("blur"),
  amount: z.string().optional(),
});
export const brightnessEffectSchema = z.object({
  type: z.literal("brightness"),
  value: z.number().optional(),
});
export const contrastEffectSchema = z.object({
  type: z.literal("contrast"),
  value: z.number().optional(),
});
export const saturateEffectSchema = z.object({
  type: z.literal("saturate"),
  value: z.number().optional(),
});
export const grayscaleEffectSchema = z.object({
  type: z.literal("grayscale"),
  value: z.number().optional(),
});
export const sepiaEffectSchema = z.object({
  type: z.literal("sepia"),
  value: z.number().optional(),
});

export const sectionEffectSchema = z.discriminatedUnion("type", [
  backdropBlurEffectSchema,
  glassEffectSchema,
  dropShadowEffectSchema,
  innerShadowEffectSchema,
  glowEffectSchema,
  opacityEffectSchema,
  blurEffectSchema,
  brightnessEffectSchema,
  contrastEffectSchema,
  saturateEffectSchema,
  grayscaleEffectSchema,
  sepiaEffectSchema,
]);
