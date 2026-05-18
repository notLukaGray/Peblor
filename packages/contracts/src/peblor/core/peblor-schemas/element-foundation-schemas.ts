import { z } from "zod";
import { motionPropsSchema, motionTimingSchema } from "./motion-props-schema";
import {
  cssInlineStyleSchema,
  jsonNullishOptional,
  jsonValueSchema,
  referrerPolicySchema,
  responsiveElementAlignSchema,
  responsiveElementAlignYSchema,
  responsiveStringSchema,
  responsiveTextAlignSchema,
  themeStringSchema,
  triggerActionSchema,
} from "./schema-primitives";
import { sectionEffectSchema } from "./section-effect-schemas";
import { peblorMetaSchema } from "./figma-exporter-meta-schema";
import { analyticsConfigSchema } from "../../../analytics/schemas";

export const borderGradientSchema = z.object({
  stroke: themeStringSchema,
  width: z.union([z.string(), z.number()]),
});

const BORDER_STYLE_KEYS = new Set([
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderColor",
  "borderWidth",
  "borderStyle",
  "borderImage",
  "borderImageSource",
  "borderImageSlice",
  "outline",
]);

const constraintsObjectSchema = z.object({
  minWidth: jsonNullishOptional(z.string()),
  maxWidth: jsonNullishOptional(z.string()),
  minHeight: jsonNullishOptional(z.string()),
  maxHeight: jsonNullishOptional(z.string()),
});

export const elementLayoutConstraintsSchema = jsonNullishOptional(constraintsObjectSchema);

/** Raw Figma constraints + geometry for absolute layout; CSS is derived in the renderer. */
const figmaConstraintsObjectSchema = z.object({
  horizontal: jsonNullishOptional(z.enum(["LEFT", "RIGHT", "LEFT_RIGHT", "CENTER", "SCALE"])),
  vertical: jsonNullishOptional(z.enum(["TOP", "BOTTOM", "TOP_BOTTOM", "CENTER", "SCALE"])),
  x: jsonNullishOptional(z.number()),
  y: jsonNullishOptional(z.number()),
  right: jsonNullishOptional(z.number()),
  bottom: jsonNullishOptional(z.number()),
  width: jsonNullishOptional(z.number()),
  height: jsonNullishOptional(z.number()),
  parentWidth: jsonNullishOptional(z.number()),
  parentHeight: jsonNullishOptional(z.number()),
});

export const figmaConstraintsSchema = jsonNullishOptional(figmaConstraintsObjectSchema);

const responsiveConstraintsInnerSchema = z.union([
  constraintsObjectSchema.optional(),
  z.tuple([constraintsObjectSchema.optional(), constraintsObjectSchema.optional()]),
]);

/**
 * Universal element interactions — available on any element type.
 * Fires the same peblor action bus used by buttons, viewport triggers, and 3D events.
 */
export const elementInteractionsSchema = jsonNullishOptional(
  z.object({
    onClick: jsonNullishOptional(triggerActionSchema),
    onHoverEnter: jsonNullishOptional(triggerActionSchema),
    onHoverLeave: jsonNullishOptional(triggerActionSchema),
    onPointerDown: jsonNullishOptional(triggerActionSchema),
    onPointerUp: jsonNullishOptional(triggerActionSchema),
    onDoubleClick: jsonNullishOptional(triggerActionSchema),
    onDragEnd: jsonNullishOptional(triggerActionSchema), // fires when a drag gesture ends
    onDragStart: jsonNullishOptional(triggerActionSchema), // fires when a drag gesture starts
    /** CSS cursor style when this element has interactions */
    cursor: jsonNullishOptional(
      z.enum([
        "pointer",
        "default",
        "grab",
        "grabbing",
        "crosshair",
        "zoom-in",
        "zoom-out",
        "text",
        "move",
        "not-allowed",
      ])
    ),
  })
);

export const elementLayoutSchema = z
  .object({
    id: jsonNullishOptional(z.string()),
    /** Namespaced metadata (`meta.figma`, etc.); passthrough preserves extension keys. */
    meta: jsonNullishOptional(peblorMetaSchema),
    /** Analytics config scoped to this element. */
    analytics: analyticsConfigSchema,
    width: jsonNullishOptional(responsiveStringSchema),
    height: jsonNullishOptional(responsiveStringSchema),
    borderRadius: jsonNullishOptional(responsiveStringSchema),
    constraints: jsonNullishOptional(responsiveConstraintsInnerSchema),
    align: jsonNullishOptional(responsiveElementAlignSchema),
    alignY: jsonNullishOptional(responsiveElementAlignYSchema),
    textAlign: jsonNullishOptional(responsiveTextAlignSchema),
    marginTop: jsonNullishOptional(responsiveStringSchema),
    marginBottom: jsonNullishOptional(responsiveStringSchema),
    marginLeft: jsonNullishOptional(responsiveStringSchema),
    marginRight: jsonNullishOptional(responsiveStringSchema),
    padding: jsonNullishOptional(responsiveStringSchema),
    paddingTop: jsonNullishOptional(responsiveStringSchema),
    paddingRight: jsonNullishOptional(responsiveStringSchema),
    paddingBottom: jsonNullishOptional(responsiveStringSchema),
    paddingLeft: jsonNullishOptional(responsiveStringSchema),
    fill: jsonNullishOptional(themeStringSchema),
    zIndex: jsonNullishOptional(z.number()),
    /** When true, hint loader to prioritize this element's fetch (e.g. fetchPriority=high for images). */
    priority: jsonNullishOptional(z.boolean()),
    fixed: jsonNullishOptional(z.boolean()),
    action: jsonNullishOptional(z.string()),
    actionPayload: jsonNullishOptional(jsonValueSchema),
    showWhen: jsonNullishOptional(
      z.enum([
        "assetPlaying",
        "assetPaused",
        "assetMuted",
        "assetUnmuted",
        "videoFullscreen",
        "videoContained",
      ])
    ),
    /** Gradient border ring rendered as a separate layer from `background` and solid `border`. */
    borderGradient: jsonNullishOptional(borderGradientSchema),
    figmaConstraints: figmaConstraintsSchema,
    wrapperStyle: jsonNullishOptional(cssInlineStyleSchema),
    /** Optional aria-* attributes spread onto the element wrapper (e.g. aria-label, aria-describedby). */
    aria: jsonNullishOptional(z.record(z.string(), z.union([z.string(), z.boolean()]))),
    /** Optional Framer Motion config from JSON: initial, animate, exit, transition, variants. Full FM control. */
    motion: z.preprocess((v) => (v === null ? undefined : v), motionPropsSchema),
    /** When false, ignore system reduced-motion preference for this element (e.g. always run parallax/entrance). Default true = respect preference. */
    reduceMotion: jsonNullishOptional(z.boolean()),
    /** Optional exit preset name (framer-motion-presets exitPresets) for unmount/hide. Use with ElementExitWrapper when show toggles. */
    exitPreset: jsonNullishOptional(z.string()),
    /** Explicit entrance/exit semantics: when and how (trigger, viewport, presets). When set, overrides legacy animate/entrance* fields for entrance behavior. */
    motionTiming: z.preprocess((v) => (v === null ? undefined : v), motionTimingSchema),
    /** When inside a reorderable section: draggable unit. "frame" = outer layout container (default), "content" = inner content only. */
    dragUnit: jsonNullishOptional(z.enum(["frame", "content"])),
    /** When draggable: "elasticSnap" (default), "free", or "none". */
    dragBehavior: jsonNullishOptional(z.enum(["elasticSnap", "free", "none"])),
    /** When draggable: axis. "x" | "y" | "both". Section reorderAxis still applies to the list. */
    dragAxis: jsonNullishOptional(z.enum(["x", "y", "both"])),
    /** Universal pointer/click interactions — fires peblor actions from any element. */
    interactions: elementInteractionsSchema,
    /** Hide this element when variable conditions are not met. Evaluated client-side against the variable store. */
    visibleWhen: jsonNullishOptional(
      z.object({
        variable: jsonNullishOptional(z.string()),
        operator: jsonNullishOptional(
          z.enum(["equals", "notEquals", "gt", "gte", "lt", "lte", "contains", "startsWith"])
        ),
        value: jsonNullishOptional(jsonValueSchema),
        conditions: jsonNullishOptional(
          z.array(
            z.object({
              variable: z.string(),
              operator: z.enum([
                "equals",
                "notEquals",
                "gt",
                "gte",
                "lt",
                "lte",
                "contains",
                "startsWith",
              ]),
              value: jsonValueSchema,
            })
          )
        ),
        logic: jsonNullishOptional(z.enum(["and", "or"])),
      })
    ),
    /** CSS opacity (0–1). */
    opacity: jsonNullishOptional(z.number().min(0).max(1)),
    /** CSS mix-blend-mode value e.g. "multiply". */
    blendMode: jsonNullishOptional(z.string()),
    /** Static initial visibility — false renders display:none. */
    hidden: jsonNullishOptional(z.boolean()),
    /** CSS overflow. */
    overflow: jsonNullishOptional(z.enum(["hidden", "visible", "auto", "scroll"])),
    /** Raw CSS box-shadow string e.g. "0 4px 12px rgba(0,0,0,0.15)". */
    boxShadow: jsonNullishOptional(z.string()),
    /** Raw CSS filter string e.g. "blur(4px) brightness(1.1)". */
    filter: jsonNullishOptional(z.string()),
    /** Raw CSS backdrop-filter string. */
    backdropFilter: jsonNullishOptional(z.string()),
    /** Generic visual effects payload supported on any surface-capable element. */
    effects: jsonNullishOptional(z.array(sectionEffectSchema)),
    /** Rotation in degrees or CSS string (e.g. "45deg"). Mirrors field on image/video/vector/SVG schemas. */
    rotate: jsonNullishOptional(z.union([z.number(), z.string()])),
    /** Mirror element horizontally. Mirrors field on image/video/vector/SVG schemas. */
    flipHorizontal: jsonNullishOptional(z.boolean()),
    /** Mirror element vertically. Mirrors field on image/video/vector/SVG schemas. */
    flipVertical: jsonNullishOptional(z.boolean()),
    /** CSS text-decoration e.g. "underline". */
    textDecoration: jsonNullishOptional(z.string()),
    /** CSS text-transform e.g. "uppercase". */
    textTransform: jsonNullishOptional(z.string()),
    /** CSS text-shadow string. */
    textShadow: jsonNullishOptional(z.string()),
    /** CSS white-space behavior. */
    whiteSpace: jsonNullishOptional(z.enum(["normal", "nowrap", "pre", "pre-wrap", "pre-line"])),
    /** CSS clip-path e.g. "circle(50%)". */
    clipPath: jsonNullishOptional(z.string()),
    /** HTML tabindex — controls keyboard focus order. -1 removes from tab sequence. */
    tabIndex: jsonNullishOptional(z.number().int()),
    /** ARIA/semantic role e.g. "region", "banner", "complementary". */
    role: jsonNullishOptional(z.string()),
  })
  .superRefine((value, ctx) => {
    if (!value.borderGradient || !value.wrapperStyle) return;
    const hasBorderStyle = Object.keys(value.wrapperStyle).some((key) =>
      BORDER_STYLE_KEYS.has(key)
    );
    if (!hasBorderStyle) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Use either `borderGradient` or border/outline styles in wrapperStyle, not both",
      path: ["wrapperStyle"],
    });
  });

export const elementVideoObjectFitSchema = z.enum(["cover", "contain", "fillWidth", "fillHeight"]);

export const elementImageObjectFitSchema = z.enum([
  "cover",
  "contain",
  "fillWidth",
  "fillHeight",
  "crop",
]);

export const responsiveImageObjectFitSchema = jsonNullishOptional(
  z.union([
    elementImageObjectFitSchema,
    z.tuple([elementImageObjectFitSchema, elementImageObjectFitSchema]),
  ])
);

export const responsiveVideoObjectFitSchema = jsonNullishOptional(
  z.union([
    elementVideoObjectFitSchema,
    z.tuple([elementVideoObjectFitSchema, elementVideoObjectFitSchema]),
  ])
);

const elementBodyVariantNumericSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const elementBodyVariantSchema = elementBodyVariantNumericSchema;
export const responsiveElementBodyVariantSchema = z.union([
  elementBodyVariantNumericSchema,
  z.tuple([elementBodyVariantNumericSchema, elementBodyVariantNumericSchema]),
]);

export const elementSimpleLinkSchema = z.object({
  ref: z.string().min(1),
  external: z.boolean(),
  target: jsonNullishOptional(z.enum(["_self", "_blank", "_parent", "_top"])),
  rel: jsonNullishOptional(z.string()),
  download: jsonNullishOptional(z.union([z.boolean(), z.string()])),
  hreflang: jsonNullishOptional(z.string()),
  ping: jsonNullishOptional(z.string()),
  referrerPolicy: jsonNullishOptional(referrerPolicySchema),
});

export const elementGraphicLinkSchema = z
  .object({
    ref: jsonNullishOptional(z.string()),
    external: jsonNullishOptional(z.boolean()),
    target: jsonNullishOptional(z.enum(["_self", "_blank", "_parent", "_top"])),
    rel: jsonNullishOptional(z.string()),
    download: jsonNullishOptional(z.union([z.boolean(), z.string()])),
    hreflang: jsonNullishOptional(z.string()),
    ping: jsonNullishOptional(z.string()),
    referrerPolicy: jsonNullishOptional(referrerPolicySchema),
    hoverScale: jsonNullishOptional(z.number()),
    hoverFill: jsonNullishOptional(themeStringSchema),
    activeFill: jsonNullishOptional(themeStringSchema),
    disabledFill: jsonNullishOptional(themeStringSchema),
    hoverStroke: jsonNullishOptional(themeStringSchema),
    activeStroke: jsonNullishOptional(themeStringSchema),
    disabledStroke: jsonNullishOptional(themeStringSchema),
    vectorTransition: jsonNullishOptional(z.union([z.string(), z.number()])),
    disabled: jsonNullishOptional(z.boolean()),
  })
  .refine((v) => !v.ref || v.external !== undefined, {
    message: "external is required when ref is set",
  });

export const vectorColorsSchema = jsonNullishOptional(z.record(z.string(), themeStringSchema));

export const vectorShapeStyleSchema = z.object({
  fill: jsonNullishOptional(themeStringSchema),
  stroke: jsonNullishOptional(themeStringSchema),
  strokeWidth: jsonNullishOptional(z.union([z.number(), z.string()])),
  strokeLinecap: jsonNullishOptional(z.enum(["butt", "round", "square"])),
  strokeLinejoin: jsonNullishOptional(z.enum(["miter", "round", "bevel"])),
  opacity: jsonNullishOptional(z.number()),
  transform: jsonNullishOptional(z.string()),
});

export const vectorGradientStopSchema = z.object({
  offset: z.string(),
  color: themeStringSchema,
  opacity: jsonNullishOptional(z.number()),
});

export const vectorLinearGradientSchema = z.object({
  type: z.literal("linearGradient"),
  id: z.string(),
  x1: jsonNullishOptional(z.union([z.number(), z.string()])),
  y1: jsonNullishOptional(z.union([z.number(), z.string()])),
  x2: jsonNullishOptional(z.union([z.number(), z.string()])),
  y2: jsonNullishOptional(z.union([z.number(), z.string()])),
  gradientUnits: jsonNullishOptional(z.enum(["userSpaceOnUse", "objectBoundingBox"])),
  gradientTransform: jsonNullishOptional(z.string()),
  stops: z.array(vectorGradientStopSchema),
});

export const vectorRadialGradientSchema = z.object({
  type: z.literal("radialGradient"),
  id: z.string(),
  cx: jsonNullishOptional(z.union([z.number(), z.string()])),
  cy: jsonNullishOptional(z.union([z.number(), z.string()])),
  r: jsonNullishOptional(z.union([z.number(), z.string()])),
  fx: jsonNullishOptional(z.union([z.number(), z.string()])),
  fy: jsonNullishOptional(z.union([z.number(), z.string()])),
  gradientUnits: jsonNullishOptional(z.enum(["userSpaceOnUse", "objectBoundingBox"])),
  stops: z.array(vectorGradientStopSchema),
});

export const vectorGradientSchema = z.discriminatedUnion("type", [
  vectorLinearGradientSchema,
  vectorRadialGradientSchema,
]);

export const vectorShapeSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("rect"),
      x: jsonNullishOptional(z.union([z.number(), z.string()])),
      y: jsonNullishOptional(z.union([z.number(), z.string()])),
      width: z.union([z.number(), z.string()]),
      height: z.union([z.number(), z.string()]),
      rx: jsonNullishOptional(z.union([z.number(), z.string()])),
      ry: jsonNullishOptional(z.union([z.number(), z.string()])),
    })
    .merge(vectorShapeStyleSchema),
  z
    .object({
      type: z.literal("circle"),
      cx: z.union([z.number(), z.string()]),
      cy: z.union([z.number(), z.string()]),
      r: z.union([z.number(), z.string()]),
    })
    .merge(vectorShapeStyleSchema),
  z
    .object({
      type: z.literal("ellipse"),
      cx: z.union([z.number(), z.string()]),
      cy: z.union([z.number(), z.string()]),
      rx: z.union([z.number(), z.string()]),
      ry: z.union([z.number(), z.string()]),
    })
    .merge(vectorShapeStyleSchema),
  z
    .object({
      type: z.literal("line"),
      x1: z.union([z.number(), z.string()]),
      y1: z.union([z.number(), z.string()]),
      x2: z.union([z.number(), z.string()]),
      y2: z.union([z.number(), z.string()]),
    })
    .merge(vectorShapeStyleSchema),
  z.object({ type: z.literal("polygon"), points: z.string() }).merge(vectorShapeStyleSchema),
  z.object({ type: z.literal("polyline"), points: z.string() }).merge(vectorShapeStyleSchema),
  z.object({ type: z.literal("path"), d: z.string() }).merge(vectorShapeStyleSchema),
]);
