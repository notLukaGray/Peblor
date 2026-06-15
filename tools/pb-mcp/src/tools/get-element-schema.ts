import type { Tool } from "../types.js";
import { findCluster, loadCatalog } from "@pb/catalog";
import {
  elementImageSchema,
  elementVideoSchema,
  elementHeadingSchema,
  elementButtonSchema,
  elementBodySchema,
  elementLinkSchema,
  elementVectorSchema,
  elementSVGSchema,
  elementRichTextSchema,
  elementRangeSchema,
  elementInputSchema,
  elementVideoTimeSchema,
  elementVideoQualitySelectSchema,
  elementSpacerSchema,
  elementDividerSchema,
  elementScrollProgressBarSchema,
  elementModel3DSchema,
  elementRiveSchema,
  elementBlockSchema,
  elementFormFieldSchema,
  elementAudioSchema,
  elementCounterSchema,
  elementMarqueeSchema,
  elementImageCompareSchema,
  elementTabsSchema,
  elementTooltipSchema,
  elementLottieSchema,
} from "@pb/contracts";
import type { z } from "zod";

// ── FIELD_HINTS ───────────────────────────────────────────────────────────────
// Hand-maintained annotation for fields where Zod reflection returns "transform".
// These are the fields you'll actually edit. Checked at runtime against Zod for
// required / acceptsThemeObject / acceptsResponsiveArray where possible.

type FieldHint = {
  type: string;
  example?: unknown;
  values?: string[];
  note?: string;
  acceptsThemeObject?: true;
  acceptsResponsiveArray?: true;
};

const FIELD_HINTS: Record<string, FieldHint> = {
  // copy
  text: { type: "string", example: "Hello world" },
  label: { type: "string", example: "Click me" },
  alt: { type: "string", example: "Descriptive alt text" },
  href: { type: "string", example: "/route or https://example.com" },
  src: { type: "string", example: "video/my-video.mp4", note: "Asset key or CDN URL" },
  level: {
    type: "number",
    example: 1,
    values: ["1", "2", "3", "4", "5", "6"],
    note: "Heading level 1–6",
  },
  semanticLevel: {
    type: "number",
    values: ["1", "2", "3", "4", "5", "6"],
    note: "Overrides the rendered tag for outline correctness without changing visual style",
  },
  variableKey: { type: "string", note: "Binds text to a runtime variable (setVariable action)" },
  // variant
  variant: {
    type: "string",
    note: "Element-specific style variant. Values come from host-config. Use list_element_types or explain_element_type to see valid values.",
    acceptsResponsiveArray: true,
  },
  // layout
  width: {
    type: "string | number",
    example: "100%",
    acceptsResponsiveArray: true,
    note: "CSS value, number (px), or 'hug'",
  },
  height: {
    type: "string | number | 'hug'",
    example: "hug",
    acceptsResponsiveArray: true,
  },
  maxWidth: { type: "string", example: "1200px" },
  minWidth: { type: "string", example: "0" },
  maxHeight: { type: "string", example: "600px" },
  minHeight: { type: "string", example: "0" },
  padding: { type: "string", example: "2rem 1rem", acceptsResponsiveArray: true },
  paddingTop: { type: "string", example: "1rem" },
  paddingBottom: { type: "string", example: "1rem" },
  paddingLeft: { type: "string", example: "1rem" },
  paddingRight: { type: "string", example: "1rem" },
  margin: { type: "string", example: "0 auto", acceptsResponsiveArray: true },
  marginTop: { type: "string", example: "1rem" },
  marginBottom: { type: "string", example: "1rem" },
  marginLeft: { type: "string", example: "auto" },
  marginRight: { type: "string", example: "auto" },
  gap: { type: "string | number", example: "1rem", acceptsResponsiveArray: true },
  // flex / grid
  display: {
    type: "string",
    example: "flex",
    values: ["flex", "grid", "block", "inline-flex", "inline-block", "none"],
    acceptsResponsiveArray: true,
  },
  flexDirection: {
    type: "string",
    example: "row",
    values: ["row", "column", "row-reverse", "column-reverse"],
    acceptsResponsiveArray: true,
  },
  flexWrap: {
    type: "string",
    example: "wrap",
    values: ["wrap", "nowrap", "wrap-reverse"],
  },
  flexGrow: { type: "number", example: 1 },
  flexShrink: { type: "number", example: 0 },
  flexBasis: { type: "string", example: "50%", acceptsResponsiveArray: true },
  flex: { type: "string", example: "1 1 auto", acceptsResponsiveArray: true },
  alignItems: {
    type: "string",
    example: "center",
    values: ["flex-start", "flex-end", "center", "stretch", "baseline"],
    acceptsResponsiveArray: true,
  },
  alignSelf: {
    type: "string",
    example: "center",
    values: ["auto", "flex-start", "flex-end", "center", "stretch", "baseline"],
    acceptsResponsiveArray: true,
  },
  justifyContent: {
    type: "string",
    example: "space-between",
    values: ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"],
    acceptsResponsiveArray: true,
  },
  order: { type: "number", example: 0, acceptsResponsiveArray: true },
  // color
  color: {
    type: "string | themeObject",
    example: "var(--pb-on-primary)",
    acceptsThemeObject: true,
    note: "CSS color value, CSS var, or { light: '…', dark: '…' }",
  },
  fill: {
    type: "string | themeObject",
    example: "oklch(0.2 0.05 250)",
    acceptsThemeObject: true,
    note: "Background fill for the element",
  },
  // typography
  fontSize: {
    type: "string | number",
    example: "clamp(1rem, 2vw, 1.5rem)",
    acceptsResponsiveArray: true,
  },
  fontWeight: { type: "number | string", example: 700, acceptsResponsiveArray: true },
  fontFamily: { type: "string", example: "var(--pb-font-sans)" },
  letterSpacing: { type: "string", example: "-0.02em", acceptsResponsiveArray: true },
  lineHeight: { type: "string | number", example: 1.4, acceptsResponsiveArray: true },
  textAlign: {
    type: "string",
    example: "left",
    values: ["left", "center", "right", "justify"],
    acceptsResponsiveArray: true,
  },
  textTransform: {
    type: "string",
    values: ["none", "uppercase", "lowercase", "capitalize"],
  },
  textDecoration: { type: "string", example: "none" },
  // visual
  opacity: { type: "number", example: 1, note: "0–1" },
  borderRadius: { type: "string", example: "0.5rem", acceptsResponsiveArray: true },
  border: { type: "string", example: "1px solid var(--pb-border)", acceptsResponsiveArray: true },
  boxShadow: { type: "string", example: "0 2px 8px oklch(0 0 0 / 0.12)" },
  overflow: { type: "string", values: ["visible", "hidden", "scroll", "auto"] },
  position: { type: "string", values: ["static", "relative", "absolute", "fixed", "sticky"] },
  zIndex: { type: "number", example: 10 },
  // action
  action: {
    type: "string (action type)",
    example: "navigate",
    note: "Action type string. Use list_action_types to see all. Set actionPayload to match.",
  },
  actionPayload: {
    type: "object",
    note: "Payload matching the action type schema. Use validate_action to check.",
  },
  // motion
  motion: {
    type: "object",
    note: "Framer-motion props: initial, animate, exit, transition, whileHover, whileTap. Or use motionTiming for presets.",
  },
  motionTiming: {
    type: "object",
    note: "High-level motion control: entrancePreset, trigger, staggerChildren, viewport, exitPreset.",
  },
  // misc
  hidden: { type: "boolean", example: false, note: "Hides the element (display: none)" },
  pointerEvents: { type: "string", values: ["auto", "none"] },
  userSelect: { type: "string", values: ["auto", "none", "text", "all"] },
};

// ── Schema registry (Zod introspection for required / theme / responsive) ────

type AnySchema = {
  def?: {
    type?: string;
    in?: AnySchema;
    shape?: Record<string, AnySchema>;
    values?: unknown[] | Set<unknown>;
  };
  shape?: Record<string, AnySchema>;
  unwrap?: () => AnySchema;
  options?: AnySchema[];
};

function elementBlockOptions(): AnySchema[] {
  const raw = elementBlockSchema as unknown as { options?: unknown[] };
  return (raw.options ?? []) as AnySchema[];
}

const SCHEMA_REGISTRY: Record<string, z.ZodTypeAny | null> = {
  elementImageSchema,
  elementVideoSchema,
  elementHeadingSchema,
  elementButtonSchema,
  elementBodySchema,
  elementLinkSchema,
  elementVectorSchema,
  elementSVGSchema,
  elementRichTextSchema,
  elementRangeSchema,
  elementInputSchema,
  elementVideoTimeSchema,
  elementVideoQualitySelectSchema,
  elementSpacerSchema,
  elementDividerSchema,
  elementScrollProgressBarSchema,
  elementModel3DSchema,
  elementRiveSchema,
  elementGroupSchema: elementBlockOptions().find(
    (opt) =>
      (opt.shape ?? opt.def?.shape)?.type?.def?.values instanceof Set &&
      ((opt.shape ?? opt.def?.shape)?.type?.def?.values as Set<unknown>).has("elementGroup")
  ) as z.ZodTypeAny,
  elementInfiniteScrollSchema: elementBlockOptions().find(
    (opt) =>
      (opt.shape ?? opt.def?.shape)?.type?.def?.values instanceof Set &&
      ((opt.shape ?? opt.def?.shape)?.type?.def?.values as Set<unknown>).has(
        "elementInfiniteScroll"
      )
  ) as z.ZodTypeAny,
  elementFormFieldSchema,
  elementAudioSchema,
  elementCounterSchema,
  elementMarqueeSchema,
  elementImageCompareSchema,
  elementTabsSchema,
  elementTooltipSchema,
  elementLottieSchema,
};

function unwrapSchema(schema: AnySchema): { schema: AnySchema; optional: boolean } {
  let current = schema;
  let optional = false;
  while (current.def?.type === "optional" && current.unwrap) {
    optional = true;
    current = current.unwrap();
  }
  if (current.def?.type === "pipe" && current.def.in) current = current.def.in;
  return { schema: current, optional };
}

function zodTypeName(schema: AnySchema): string {
  return schema.def?.type ?? "unknown";
}

function looksLikeThemeObject(schema: AnySchema): boolean {
  const shape = schema.shape ?? schema.def?.shape;
  if (!shape) return false;
  return "light" in shape && "dark" in shape;
}

function looksResponsiveArray(schema: AnySchema): boolean {
  if (zodTypeName(schema) !== "union") return false;
  return (schema.options ?? []).some((opt) => zodTypeName(opt) === "tuple");
}

function zodFieldInfo(schema: AnySchema): {
  required: boolean;
  acceptsThemeObject: boolean;
  acceptsResponsiveArray: boolean;
  isTransform: boolean;
} {
  const { schema: s, optional } = unwrapSchema(schema);
  const type = zodTypeName(s);
  return {
    required: !optional,
    acceptsThemeObject: type === "union" && (s.options ?? []).some(looksLikeThemeObject),
    acceptsResponsiveArray: looksResponsiveArray(s),
    isTransform: type === "transform" || type === "unknown",
  };
}

// ── tool ─────────────────────────────────────────────────────────────────────

export const getElementSchema: Tool = {
  def: {
    name: "get_element_schema",
    description:
      "Return the full field schema + examples for a component. Shows catalog metadata (axes, " +
      "composes_with, feels_like), annotated key fields with real types and examples, and valid " +
      "enum values. Use this to generate valid JSON without guessing field names.",
    inputSchema: {
      type: "object",
      properties: {
        clusterId: {
          type: "string",
          description:
            "e.g. 'element.heading', 'element.image', 'element.button', 'section.contentBlock'",
        },
      },
      required: ["clusterId"],
    },
  },

  run: async (args) => {
    const { clusterId } = args as { clusterId: string };
    const entry = findCluster(clusterId);
    if (!entry) throw new Error(`Catalog entry not found: ${clusterId}`);

    // ── gather Zod field info ────────────────────────────────────────────────
    const zodSchema = SCHEMA_REGISTRY[entry.schema_ref];
    const zodFields: Record<
      string,
      { required: boolean; acceptsThemeObject: boolean; acceptsResponsiveArray: boolean }
    > = {};

    if (zodSchema) {
      const anySchema = zodSchema as unknown as AnySchema;
      const shape = anySchema.shape ?? anySchema.def?.shape;
      if (shape) {
        for (const [key, fieldSchema] of Object.entries(shape)) {
          const info = zodFieldInfo(fieldSchema as AnySchema);
          if (!info.isTransform || key in FIELD_HINTS) {
            zodFields[key] = {
              required: info.required,
              acceptsThemeObject:
                info.acceptsThemeObject || FIELD_HINTS[key]?.acceptsThemeObject === true,
              acceptsResponsiveArray:
                info.acceptsResponsiveArray || FIELD_HINTS[key]?.acceptsResponsiveArray === true,
            };
          }
        }
      }
    }

    // ── key fields: axes fields + FIELD_HINTS intersection ──────────────────
    const axisFields = new Set(entry.axes.flatMap((a) => a.fields));
    const hintFields = new Set(Object.keys(FIELD_HINTS));
    const relevantFields = new Set([...axisFields, ...hintFields, "type"]);

    // Literal type value from type field
    let typeValue: string | undefined;
    if (zodSchema) {
      const anySchema = zodSchema as unknown as AnySchema;
      const shape = anySchema.shape ?? anySchema.def?.shape;
      if (shape?.type) {
        const typeField = shape.type as AnySchema;
        const vals = typeField.def?.values;
        if (vals instanceof Set && vals.size === 1) {
          typeValue = String([...vals][0]);
        }
      }
    }

    const keyFields: Record<string, Record<string, unknown>> = {};

    // Always include type first
    keyFields["type"] = {
      required: true,
      type: "literal",
      value: typeValue ?? clusterId.split(".").pop(),
    };

    // Fields from axes
    for (const axis of entry.axes) {
      for (const field of axis.fields) {
        if (field === "type") continue;
        const zodInfo = zodFields[field] ?? {
          required: false,
          acceptsThemeObject: false,
          acceptsResponsiveArray: false,
        };
        const hint = FIELD_HINTS[field];
        keyFields[field] = {
          required: zodInfo.required,
          type: hint?.type ?? "unknown",
          ...(hint?.example !== undefined && { example: hint.example }),
          ...(hint?.values && { values: hint.values }),
          ...(hint?.note && { note: hint.note }),
          acceptsThemeObject: zodInfo.acceptsThemeObject || hint?.acceptsThemeObject === true,
          acceptsResponsiveArray:
            zodInfo.acceptsResponsiveArray || hint?.acceptsResponsiveArray === true,
          _axis: axis.name,
        };
      }
    }

    // Fields from FIELD_HINTS that are in the Zod schema but not already in axes
    for (const field of hintFields) {
      if (field === "type" || field in keyFields) continue;
      if (!(field in zodFields)) continue; // not in this element's schema
      const zodInfo = zodFields[field]!;
      const hint = FIELD_HINTS[field]!;
      keyFields[field] = {
        required: zodInfo.required,
        type: hint.type,
        ...(hint.example !== undefined && { example: hint.example }),
        ...(hint.values && { values: hint.values }),
        ...(hint.note && { note: hint.note }),
        acceptsThemeObject: zodInfo.acceptsThemeObject || hint.acceptsThemeObject === true,
        acceptsResponsiveArray:
          zodInfo.acceptsResponsiveArray || hint.acceptsResponsiveArray === true,
      };
    }

    // Build the full catalog metadata
    const catalog = loadCatalog();
    const exampleFile = entry.covers[0]?.example ?? null;

    return {
      clusterId,
      schemaRef: entry.schema_ref,
      feelsLike: entry.feels_like.trim(),
      notThisIf: entry.not_this_if,
      composedUnder: entry.composes_with?.parents ?? [],
      axes: entry.axes.map((a) => ({
        name: a.name,
        fields: a.fields,
        ...(a.note && { note: a.note }),
        ...(a.responsive && { responsive: a.responsive }),
      })),
      keyFields,
      exampleFile,
      notes: [
        "whileHover and whileTap live inside `motion`, not at element root.",
        "Fields marked acceptsResponsiveArray accept [mobile, desktop] tuples.",
        "Fields marked acceptsThemeObject accept { light: '…', dark: '…' } objects.",
        ...(entry.known_limitations ?? []),
      ],
      _unusedHint: `${relevantFields.size} relevant fields; ${catalog.entries.length} total catalog entries`,
    };
  },
};
