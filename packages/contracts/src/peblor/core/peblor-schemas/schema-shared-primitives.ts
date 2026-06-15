import { z } from "zod";
import { responsiveValueSchema } from "./responsive-value-schemas";

// ---------------------------------------------------------------------------
// Heading level 1-6 — shared across element schemas that need an h1-h6 semantic level
// ---------------------------------------------------------------------------

export const headingLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

// ---------------------------------------------------------------------------
// Recursive JSON value & condition schemas
// (Moved here from schema-primitives.ts to break a circular import chain —
//  both schema-primitives and schema-shared-primitives need these.)
// ---------------------------------------------------------------------------

/** Recursive JSON value schema — mirrors the JsonValue type from core/lib/json-value.ts. */
export const jsonValueSchema: z.ZodType<import("../../../core/lib/json-value").JsonValue> = z.lazy(
  () =>
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(jsonValueSchema),
      z.record(z.string(), jsonValueSchema),
    ])
);

/** Condition operator enum shared by visibleWhen and conditionalAction schemas. */
export const conditionOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "startsWith",
  "endsWith",
  "isNull",
  "isNotNull",
  "in",
  "notIn",
  "isEmpty",
  "isNotEmpty",
  "hasKey",
  "notHasKey",
  "matches",
]);

/** Single variable condition: check a named variable against a value with an operator. */
export const variableConditionSchema = z.object({
  variable: z.string(),
  operator: conditionOperatorSchema,
  value: jsonValueSchema,
});

/** Recursive nested condition group: (A AND B) OR (C AND D) style compound conditions. */
export const conditionGroupSchema: z.ZodType<
  import("../peblor-condition-evaluator").ConditionGroup
> = z.lazy(() =>
  z.object({
    logic: z.enum(["and", "or"]),
    conditions: z.array(z.union([variableConditionSchema, conditionGroupSchema])),
  })
);

// ---------------------------------------------------------------------------
// Theme strings — string or { value?, light?, dark? } objects
// ---------------------------------------------------------------------------

const nonEmptyThemeStringValueSchema = z.string().min(1);

export const themeStringObjectSchema = z
  .object({
    value: nonEmptyThemeStringValueSchema.optional(),
    light: nonEmptyThemeStringValueSchema.optional(),
    dark: nonEmptyThemeStringValueSchema.optional(),
  })
  .refine((value) => value.value != null || value.light != null || value.dark != null, {
    message: "Theme string object must include at least one of value, light, or dark",
  });

export const themeStringSchema = z.union([nonEmptyThemeStringValueSchema, themeStringObjectSchema]);

export type ThemeString = z.infer<typeof themeStringSchema>;

export const responsiveThemeStringSchema = responsiveValueSchema(themeStringSchema);

// ---------------------------------------------------------------------------
// Structured gradient — theme-aware gradient with typed stops.
// Usable wherever a gradient/fill is accepted. Stop colors are theme strings
// so each stop can resolve independently in light/dark mode.
// ---------------------------------------------------------------------------

/**
 * A single gradient stop with a themeable color and optional position.
 * `color` is a themeString so each stop can resolve for light/dark independently.
 * `position` is a CSS length or percentage string (e.g. "0%", "50%", "100px").
 */
export const gradientStopSchema = z.object({
  color: themeStringSchema,
  position: z.string().optional(),
  /** Optional CSS `color-hint` between stops (percentage, as a plain string). */
  hint: z.string().optional(),
});

export type GradientStop = z.infer<typeof gradientStopSchema>;

/**
 * Structured gradient object — compiled to a CSS gradient() call at render time.
 * Theme-aware: each stop's color is resolved against the active theme before assembly.
 *
 * type "linear":
 *   `angle` — CSS angle string (e.g. "45deg", "to bottom right"). Defaults to "to bottom".
 * type "radial":
 *   `shape` — "circle" | "ellipse". Defaults to "ellipse".
 *   `size`  — CSS radial-gradient size keyword (e.g. "closest-side", "farthest-corner").
 *   `at`    — CSS position string (e.g. "center", "top left"). Defaults to "center".
 * type "conic":
 *   `angle` — starting angle (e.g. "0deg").
 *   `at`    — CSS position string. Defaults to "center".
 */
export const structuredGradientSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("linear"),
    angle: z.string().optional(),
    stops: z.array(gradientStopSchema).min(2),
    repeat: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("radial"),
    shape: z.enum(["circle", "ellipse"]).optional(),
    size: z.string().optional(),
    at: z.string().optional(),
    stops: z.array(gradientStopSchema).min(2),
    repeat: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("conic"),
    angle: z.string().optional(),
    at: z.string().optional(),
    stops: z.array(gradientStopSchema).min(2),
    repeat: z.boolean().optional(),
  }),
]);

export type StructuredGradient = z.infer<typeof structuredGradientSchema>;

/**
 * Extended theme string that also accepts a structured gradient object.
 * Use wherever a fill/background can be a gradient (e.g. section fill, element fill,
 * background variable layers). The renderer compiles the structured form to a CSS string.
 */
export const themeStringOrGradientSchema = z.union([themeStringSchema, structuredGradientSchema]);

export type ThemeStringOrGradient = z.infer<typeof themeStringOrGradientSchema>;

// ---------------------------------------------------------------------------
// Text fill — shared across element schemas that support textFill (color/gradient/image)
// The base includes only color+gradient; extended schemas can add variants as needed.
// ---------------------------------------------------------------------------

export const textFillBaseSchema = z.union([
  z.object({ type: z.literal("color"), value: themeStringSchema }),
  z.object({ type: z.literal("gradient"), value: themeStringSchema }),
]);

// ---------------------------------------------------------------------------
// CSS inline style values
// ---------------------------------------------------------------------------

export const cssInlineStyleValueSchema = z.union([themeStringSchema, z.number()]);
export const cssInlineStyleSchema = z.record(z.string(), cssInlineStyleValueSchema);

// ---------------------------------------------------------------------------
// Responsive helpers
// ---------------------------------------------------------------------------

/**
 * Responsive string: routed through the shared `responsiveValueSchema` factory, so it
 * accepts any responsive shape — a scalar (all breakpoints), a `[mobile, desktop]` tuple,
 * a legacy `{ mobile?, desktop? }` object, a Tailwind-style tier map
 * (`{ base?, sm?, md?, lg?, xl?, "2xl"? }`), or a container map (`{ "@container": { … } }`).
 *
 * **Legacy tuple index convention: `[mobile, desktop]`** — index 0 resolves when
 * `isMobile === true`, index 1 when `isMobile === false`. This matches
 * `resolveResponsiveValue` (packages/runtime-react/src/core/lib/responsive-value.ts), which
 * collapses every shape to a single value for non-style JS logic; the CSS-emission layer
 * uses the full tier map for `@media` / `@container` fidelity.
 */
export const responsiveStringSchema = responsiveValueSchema(z.string());

/**
 * JSON.parse leaves explicit `null`; Zod `.optional()` only treats `undefined` as absent (SCHEMA-2).
 * Use for optional fields that may be serialized as `null` from CMS or hand-edited JSON.
 */
export function jsonNullishOptional<T extends z.ZodTypeAny>(inner: T) {
  return z.preprocess((v) => (v === null ? undefined : v), inner.optional());
}

/**
 * Creates a variant enum that normalises non-canonical alias strings before validation.
 * Content that uses aliases will still pass validation (aliases are converted to canonical
 * values), ensuring forwards compatibility while canonical forms are enforced.
 *
 * Example:
 * ```
 * variant: jsonNullishOptional(variantWithAliases(
 *   ["display", "section", "label"] as const,
 *   { headline: "display", title: "display", subheading: "section" }
 * ))
 * ```
 */
export function variantWithAliases<const T extends readonly string[]>(
  values: T,
  aliases: Record<string, T[number]>
) {
  return z.preprocess((val) => {
    if (typeof val === "string") {
      const normalized = val
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
      if (normalized in aliases) return aliases[normalized as keyof typeof aliases];
    }
    return val;
  }, z.enum(values));
}

// ---------------------------------------------------------------------------
// Typography overrides — shared across elementHeading, elementBody, elementLink
// (and consumed as a subset by elementButton).
//
// ALL fields use jsonNullishOptional so that explicit JSON `null` is treated as
// absent. This resolves a drift that existed between heading (which already used
// jsonNullishOptional) and body/link (which used bare .optional()). Choosing the
// more permissive convention is safe: it only LOOSENs body/link validation
// (explicit null now accepted where it was previously rejected), so no existing
// content that validated before will fail now.
//
// Fields that appear in only some variants (color, textFill, maxLines, wordWrap,
// variableKey, audio-bind fields, link-color fields) stay on their respective
// variant schemas.
// ---------------------------------------------------------------------------

/**
 * Responsive size value: a single CSS string or number (applied at all breakpoints),
 * or a two-element `[mobile, desktop]` tuple for per-breakpoint overrides.
 *
 * **Tuple index convention: `[mobile, desktop]`** — matches `resolveResponsiveValue` convention.
 * Scalars pass through unchanged so all existing content remains valid (additive change).
 */
const scalarSizeValue = z.union([z.string(), z.number()]);
const responsiveSizeValue = responsiveValueSchema(scalarSizeValue);

export const typographyOverridesSchema = z.object({
  /**
   * Font family override. Use a named slot to follow the active typeface:
   * `"primary"` | `"secondary"` | `"mono"`.
   * Any other string is passed through as a raw CSS font-family value.
   */
  fontFamily: jsonNullishOptional(z.string()),
  /**
   * CSS font-size. Accepts a scalar string/number or a responsive `[mobile, desktop]` tuple.
   * Resolved via `resolveResponsiveValue` at render time.
   */
  fontSize: jsonNullishOptional(responsiveSizeValue),
  fontWeight: jsonNullishOptional(z.union([z.string(), z.number()])),
  /**
   * CSS line-height. Accepts a scalar string/number or a responsive `[mobile, desktop]` tuple.
   * Resolved via `resolveResponsiveValue` at render time.
   */
  lineHeight: jsonNullishOptional(responsiveSizeValue),
  /**
   * CSS letter-spacing. Accepts a scalar string/number or a responsive `[mobile, desktop]` tuple.
   * Resolved via `resolveResponsiveValue` at render time.
   */
  letterSpacing: jsonNullishOptional(responsiveSizeValue),
  fontFeatureSettings: jsonNullishOptional(z.string()),
  textOverflow: jsonNullishOptional(z.string()),
  textStroke: jsonNullishOptional(z.string()),
  verticalAlign: jsonNullishOptional(z.string()),
  /**
   * CSS margin-bottom between paragraphs. Accepts a scalar string/number or a responsive
   * `[mobile, desktop]` tuple. Resolved via `resolveResponsiveValue` at render time.
   */
  paragraphSpacing: jsonNullishOptional(responsiveSizeValue),
  // ---------------------------------------------------------------------------
  // Extended typography — gap 1.2
  // Properties that were previously impossible to express from JSON.
  // ---------------------------------------------------------------------------
  /** CSS font-style: normal | italic | oblique */
  fontStyle: jsonNullishOptional(z.enum(["normal", "italic", "oblique"])),
  /** Raw CSS font-variation-settings value for variable fonts, e.g. `'"wght" 400'` */
  fontVariationSettings: jsonNullishOptional(z.string()),
  /** Raw CSS font-variant value, e.g. `"small-caps"` */
  fontVariant: jsonNullishOptional(z.string()),
  /** CSS font-kerning */
  fontKerning: jsonNullishOptional(z.enum(["auto", "normal", "none"])),
  /** CSS text-wrap */
  textWrap: jsonNullishOptional(z.enum(["wrap", "nowrap", "balance", "pretty", "stable"])),
  /** CSS hyphens */
  hyphens: jsonNullishOptional(z.enum(["none", "manual", "auto"])),
  /** CSS word-break — explicit override; when absent, wordWrap boolean controls the default */
  wordBreak: jsonNullishOptional(z.enum(["normal", "break-all", "keep-all", "break-word"])),
  /** CSS overflow-wrap — explicit override; when absent, wordWrap boolean controls the default */
  overflowWrap: jsonNullishOptional(z.enum(["normal", "break-word", "anywhere"])),
  /** CSS text-indent */
  textIndent: jsonNullishOptional(z.union([z.string(), z.number()])),
  /** CSS text-underline-offset */
  textUnderlineOffset: jsonNullishOptional(z.union([z.string(), z.number()])),
});

// ---------------------------------------------------------------------------
// Alignment schemas
// sectionAlignEnum and elementAlignEnum were identical ("left","center","right","full").
// Collapsed to one enum; both responsive schemas are kept as separate named exports
// so existing import sites don't need touching.
// ---------------------------------------------------------------------------

const alignEnum = z.enum(["left", "center", "right", "full"]);
/** Canonical responsive alignment — use for new code. */
export const responsiveAlignSchema = responsiveValueSchema(alignEnum);
/** @deprecated Use responsiveAlignSchema instead. */
export const responsiveSectionAlignSchema = responsiveAlignSchema;
/** @deprecated Use responsiveAlignSchema instead. */
export const responsiveElementAlignSchema = responsiveAlignSchema;

const elementAlignYEnum = z.enum(["top", "center", "bottom"]);
export const responsiveElementAlignYSchema = responsiveValueSchema(elementAlignYEnum);

export const elementTextAlignSchema = z.enum(["left", "right", "center", "justify"]);
export const responsiveTextAlignSchema = responsiveValueSchema(elementTextAlignSchema);

// ---------------------------------------------------------------------------
// Boolean / referrer / visibility
// ---------------------------------------------------------------------------

export const responsiveBooleanSchema = responsiveValueSchema(z.boolean()).optional();

export const referrerPolicySchema = z.enum([
  "no-referrer",
  "no-referrer-when-downgrade",
  "origin",
  "origin-when-cross-origin",
  "same-origin",
  "strict-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url",
]);

/**
 * Boolean-ish coercion: normalizes string truthy/falsy values ("true", "1", "yes", "on",
 * "false", "0", "no", "off") to booleans. Passes real booleans through. Rejects other types.
 * Extracted from section-effect-schemas for shared use (C-20).
 */
export const booleanishSchema = z.preprocess((value) => {
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

/**
 * Shared visibleWhen condition: controls element/section/module visibility based on
 * runtime variable state. Uses jsonNullishOptional so that null in JSON is treated
 * as absent (CMS-friendly). Extracted from element-foundation-schemas and
 * section-block-base-schemas (C-13).
 */
export const visibleWhenSchema = jsonNullishOptional(
  z.object({
    variable: jsonNullishOptional(z.string()),
    operator: jsonNullishOptional(conditionOperatorSchema),
    value: jsonNullishOptional(jsonValueSchema),
    conditions: jsonNullishOptional(
      z.array(z.union([variableConditionSchema, conditionGroupSchema]))
    ),
    logic: jsonNullishOptional(z.enum(["and", "or"])),
  })
);

/**
 * Shared progressRange schema for scroll-driven background transitions.
 * Used by both background-block-schemas and page-definition-and-resolution-schemas.
 */
export const progressRangeSchema = z
  .object({
    start: z.number().min(0).max(1),
    end: z.number().min(0).max(1),
  })
  .refine((range) => range.start < range.end, {
    message: "progressRange.start must be less than progressRange.end",
  });

// ---------------------------------------------------------------------------
// Reorderable drag props — shared between section content blocks and element groups
// ---------------------------------------------------------------------------

export const reorderablePropsSchema = z.object({
  reorderable: jsonNullishOptional(z.boolean()),
  reorderAxis: jsonNullishOptional(z.enum(["x", "y"])),
  reorderDragUnit: jsonNullishOptional(z.enum(["frame", "content"])),
  reorderDragBehavior: jsonNullishOptional(z.enum(["elasticSnap", "free", "none", "swap"])),
});

// ---------------------------------------------------------------------------
// Cursor schema — shared between sections and elements
// ---------------------------------------------------------------------------

const CURSOR_VALUES = [
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
  "auto",
  "none",
] as const;

/** CSS cursor value — accepts JSON null (treated as absent). Use for both sections and elements. */
export const cursorSchema = jsonNullishOptional(z.enum(CURSOR_VALUES));

// ---------------------------------------------------------------------------
// Scroll snap type — shared between page scroll config and element scroll snap
// ---------------------------------------------------------------------------

/** CSS scroll-snap-type values accepted by both page-level and element-level schemas. */
export const scrollSnapTypeEnum = z.enum([
  "none",
  "x mandatory",
  "y mandatory",
  "both mandatory",
  "x proximity",
  "y proximity",
  "both proximity",
]);
