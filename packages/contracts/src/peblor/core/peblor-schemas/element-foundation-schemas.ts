import { z } from "zod";
import { motionPropsSchema, motionTimingSchema } from "./motion-props-schema";
import { responsiveValueSchema } from "./responsive-value-schemas";
import {
  cssInlineStyleSchema,
  cursorSchema,
  jsonNullishOptional,
  jsonValueSchema,
  referrerPolicySchema,
  responsiveBooleanSchema,
  responsiveElementAlignSchema,
  responsiveElementAlignYSchema,
  responsiveStringSchema,
  responsiveTextAlignSchema,
  themeStringSchema,
  themeStringOrGradientSchema,
  TRIGGER_ACTION_CORE_VARIANTS,
  triggerActionSchemaCore,
  validateActionPayload,
  visibleWhenSchema,
} from "./schema-primitives";
import { peblorMetaSchema } from "./figma-exporter-meta-schema";
import { analyticsConfigSchema } from "../../../analytics/schemas";
import {
  spacingSchema,
  borderSchema,
  overflowClipSchema,
  scrollSnapSchema,
  effectsSchema,
} from "./layout-sub-schemas";
export { borderGradientSchema } from "./layout-sub-schemas";

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

/**
 * Responsive constraints: single object or [mobile, desktop] tuple.
 * Single-level optionality only — the outer jsonNullishOptional at the usage
 * site (`constraints` field) handles absent/null. Inner .optional() were
 * removed to prevent `[undefined, undefined]` from validating as a valid
 * responsive constraint (double-optionality, C-13).
 */
const responsiveConstraintsInnerSchema = responsiveValueSchema(constraintsObjectSchema);

/**
 * Universal element interactions — available on any element type.
 * Fires the same peblor action bus used by buttons, viewport triggers, and 3D events.
 */
export const elementInteractionsSchema = jsonNullishOptional(
  z.object({
    onClick: jsonNullishOptional(triggerActionSchemaCore),
    onHoverEnter: jsonNullishOptional(triggerActionSchemaCore),
    onHoverLeave: jsonNullishOptional(triggerActionSchemaCore),
    onPointerDown: jsonNullishOptional(triggerActionSchemaCore),
    onPointerUp: jsonNullishOptional(triggerActionSchemaCore),
    onDoubleClick: jsonNullishOptional(triggerActionSchemaCore),
    onDragEnd: jsonNullishOptional(triggerActionSchemaCore), // fires when a drag gesture ends
    onDragStart: jsonNullishOptional(triggerActionSchemaCore), // fires when a drag gesture starts
    /** CSS cursor style when this element has interactions */
    cursor: cursorSchema,
  })
);

/** Union of all canonical trigger action type strings — derived from TRIGGER_ACTION_CORE_VARIANTS.
 * Shared by elementLayoutSchemaBase.action and elementButtonSchema; drift is structurally
 * impossible since both derive from the same source. */
type ElementActionType = (typeof TRIGGER_ACTION_CORE_VARIANTS)[number]["shape"]["type"]["value"];
const elementActionTypeList = TRIGGER_ACTION_CORE_VARIANTS.map(
  (v) => v.shape.type.value
) as ElementActionType[] as [ElementActionType, ...ElementActionType[]];

/** Zod enum schema for the base element `action` field — validates against all canonical trigger action types. */
const elementActionTypeSchema = z.enum(elementActionTypeList);

/**
 * Base element layout object schema WITHOUT the superRefine on borderGradient.
 * Exported so consumers can use `.omit()` etc. (which fails on refined schemas in Zod 4).
 * The refined version is `elementLayoutSchema` below (C-06).
 */
export const elementLayoutSchemaBase = z.object({
  // Composed from shared sub-schemas — see layout-sub-schemas.ts
  ...spacingSchema.shape,
  ...borderSchema.shape,
  ...overflowClipSchema.shape,
  ...scrollSnapSchema.shape,
  ...effectsSchema.shape,

  // Remaining fields that don't belong to any sub-schema
  id: jsonNullishOptional(z.string()),
  /** Namespaced metadata (`meta.figma`, etc.); passthrough preserves extension keys. */
  meta: jsonNullishOptional(peblorMetaSchema),
  /** Analytics config scoped to this element. */
  analytics: analyticsConfigSchema,
  width: jsonNullishOptional(responsiveStringSchema),
  height: jsonNullishOptional(responsiveStringSchema),
  constraints: jsonNullishOptional(responsiveConstraintsInnerSchema),
  selfAlign: jsonNullishOptional(responsiveElementAlignSchema),
  alignY: jsonNullishOptional(responsiveElementAlignYSchema),
  textAlign: jsonNullishOptional(responsiveTextAlignSchema),
  fill: jsonNullishOptional(themeStringOrGradientSchema),
  layer: jsonNullishOptional(z.number()),
  /** When true, hint loader to prioritize this element's fetch (e.g. fetchPriority=high for images). */
  priority: jsonNullishOptional(z.boolean()),
  flexShrink: jsonNullishOptional(z.number()),
  flexGrow: jsonNullishOptional(z.number()),
  flexBasis: jsonNullishOptional(responsiveStringSchema),
  order: jsonNullishOptional(z.number()),
  alignSelf: jsonNullishOptional(responsiveStringSchema),
  fixed: jsonNullishOptional(z.boolean()),
  sticky: jsonNullishOptional(z.boolean()),
  position: jsonNullishOptional(responsiveStringSchema),
  top: jsonNullishOptional(responsiveStringSchema),
  right: jsonNullishOptional(responsiveStringSchema),
  bottom: jsonNullishOptional(responsiveStringSchema),
  left: jsonNullishOptional(responsiveStringSchema),
  inset: jsonNullishOptional(responsiveStringSchema),
  /** Trigger action type — must be a known action from the canonical list. */
  action: jsonNullishOptional(elementActionTypeSchema),
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
  figmaConstraints: figmaConstraintsSchema,
  wrapperStyle: jsonNullishOptional(cssInlineStyleSchema),
  /** Optional aria-* attributes spread onto the element wrapper (e.g. aria-label, aria-describedby). */
  aria: jsonNullishOptional(z.record(z.string(), z.union([z.string(), z.boolean()]))),
  /** Optional Framer Motion config from JSON: initial, animate, exit, transition, variants. Full FM control. */
  motion: z.preprocess((v) => (v === null ? undefined : v), motionPropsSchema),
  /** Entrance timing and viewport trigger configuration. */
  motionTiming: motionTimingSchema,
  /** When false, ignore system reduced-motion preference for this element (e.g. always run parallax/entrance). Default true = respect preference. */
  reduceMotion: jsonNullishOptional(z.boolean()),
  /** Optional exit preset name (framer-motion-presets exitPresets) for unmount/hide. Use with ElementExitWrapper when show toggles. */
  exitPreset: jsonNullishOptional(z.string()),
  /** When inside a reorderable section: draggable unit. "frame" = outer layout container (default), "content" = inner content only. */
  dragUnit: jsonNullishOptional(z.enum(["frame", "content"])),
  /** When draggable: "elasticSnap" (default), "free", or "none". */
  dragBehavior: jsonNullishOptional(z.enum(["elasticSnap", "free", "none"])),
  /** When draggable: axis. "x" | "y" | "both". Section reorderAxis still applies to the list. */
  dragAxis: jsonNullishOptional(z.enum(["x", "y", "both"])),
  /** Universal pointer/click interactions — fires peblor actions from any element. */
  interactions: elementInteractionsSchema,
  /** Hide this element when variable conditions are not met. Evaluated client-side against the variable store. */
  visibleWhen: visibleWhenSchema,
  /** Visibility control — false renders display:none. Accepts responsive { mobile, desktop } overrides. */
  hidden: jsonNullishOptional(responsiveBooleanSchema),
  /** CSS aspect-ratio e.g. "16 / 9" (string), 1.777 (number), or responsive ["4/3", "16/9"] tuple. */
  aspectRatio: jsonNullishOptional(responsiveValueSchema(z.union([z.string(), z.number()]))),
  /** CSS isolation — "isolate" creates a new stacking context. */
  isolation: jsonNullishOptional(z.enum(["auto", "isolate"])),
  /** CSS content-visibility hint. "auto" enables browser rendering skip for off-screen content. */
  contentVisibility: jsonNullishOptional(z.enum(["visible", "auto", "hidden"])),
  /** Raw CSS contain value e.g. "layout paint" or "strict". */
  contain: jsonNullishOptional(z.string()),
  /**
   * Render screen-reader-only: element is invisible but present in the accessibility tree.
   * Uses the standard sr-only clip pattern (NOT display:none).
   * Independent of `hidden` — both may coexist but `visuallyHidden` takes sr-only precedence.
   */
  visuallyHidden: jsonNullishOptional(z.boolean()),
  interaction: jsonNullishOptional(z.string()),
  selectable: jsonNullishOptional(z.string()),
  /** HTML tabindex — controls keyboard focus order. -1 removes from tab sequence. */
  tabIndex: jsonNullishOptional(z.number().int()),
  /** ARIA/semantic role e.g. "region", "banner", "complementary". */
  role: jsonNullishOptional(z.string()),
  /**
   * Live variable bindings — map field names to variable paths.
   * The runtime subscribes to each variable and overrides the static prop value.
   * Example: `{ "text": "product.name", "href": "product.url" }`
   */
  bindings: jsonNullishOptional(z.record(z.string(), z.string())),
  /** CSS property bag applied on :hover — rendered via a scoped <style> class (not inline style). */
  hoverStyle: jsonNullishOptional(cssInlineStyleSchema),
  /** CSS property bag applied on :focus — rendered via a scoped <style> class (not inline style). */
  focusStyle: jsonNullishOptional(cssInlineStyleSchema),
  /** CSS property bag applied on :focus-visible — rendered via a scoped <style> class (not inline style). */
  focusVisibleStyle: jsonNullishOptional(cssInlineStyleSchema),
  /** CSS property bag applied on :active — rendered via a scoped <style> class (not inline style). */
  activeStyle: jsonNullishOptional(cssInlineStyleSchema),
  /** CSS property bag applied on :disabled and [aria-disabled="true"] — rendered via a scoped <style> class (not inline style). */
  disabledStyle: jsonNullishOptional(cssInlineStyleSchema),
});

/**
 * Refined element layout schema with:
 *   1. borderGradient vs border/wrapperStyle mutual-exclusion (C-06).
 *   2. actionPayload cross-validation — when `action` is present, validates that
 *      `actionPayload` satisfies the canonical payload schema for that action type.
 *      Shared implementation via validateActionPayload (same logic as elementButtonSchema).
 *
 * The base object (without superRefine) is available as elementLayoutSchemaBase for consumers
 * that need `.omit()` etc.
 */
export const elementLayoutSchema = elementLayoutSchemaBase
  .superRefine((value, ctx) => {
    if (!value.borderGradient) return;
    const hasBorderField =
      value.border != null ||
      value.borderTop != null ||
      value.borderRight != null ||
      value.borderBottom != null ||
      value.borderLeft != null;
    if (hasBorderField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either `borderGradient` or `border`/`borderTop`/etc., not both",
        path: ["borderGradient"],
      });
      return;
    }
    if (!value.wrapperStyle) return;
    const hasBorderStyle = Object.keys(value.wrapperStyle).some((key) =>
      BORDER_STYLE_KEYS.has(key)
    );
    if (!hasBorderStyle) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Use either `borderGradient` or border/outline styles in wrapperStyle, not both",
      path: ["wrapperStyle"],
    });
  })
  .superRefine((value, ctx) => {
    if (!value.action) return;
    validateActionPayload(value.action, value.actionPayload, ctx);
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
  responsiveValueSchema(elementImageObjectFitSchema)
);

export const responsiveVideoObjectFitSchema = jsonNullishOptional(
  responsiveValueSchema(elementVideoObjectFitSchema)
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
export const responsiveElementBodyVariantSchema = responsiveValueSchema(
  elementBodyVariantNumericSchema
);

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
