import type { Tool } from "../types.js";
import { findCluster } from "@pb/catalog";
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
} from "@pb/contracts";
import type { z } from "zod";

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
};

function unwrap(schema: AnySchema): { schema: AnySchema; optional: boolean } {
  let current = schema;
  let optional = false;
  while (current.def?.type === "optional" && current.unwrap) {
    optional = true;
    current = current.unwrap();
  }
  if (current.def?.type === "pipe" && current.def.in) current = current.def.in;
  return { schema: current, optional };
}

function typeName(schema: AnySchema): string {
  return schema.def?.type ?? "unknown";
}

function looksLikeThemeObject(schema: AnySchema): boolean {
  const shape = schema.shape ?? schema.def?.shape;
  if (!shape) return false;
  return "light" in shape && "dark" in shape;
}

function looksResponsiveArray(schema: AnySchema): boolean {
  if (typeName(schema) !== "union") return false;
  const opts = schema.options ?? [];
  return opts.some((opt) => typeName(opt) === "tuple");
}

function describeField(schema: AnySchema): unknown {
  const unwrapped = unwrap(schema);
  const s = unwrapped.schema;
  const shape = s.shape ?? s.def?.shape;
  const nested = shape
    ? Object.fromEntries(
        Object.entries(shape).map(([key, value]) => [key, describeField(value as AnySchema)])
      )
    : undefined;
  return {
    type: typeName(s),
    required: !unwrapped.optional,
    acceptsThemeObject: typeName(s) === "union" && (s.options ?? []).some(looksLikeThemeObject),
    acceptsResponsiveArray: looksResponsiveArray(s),
    ...(nested ? { fields: nested } : {}),
  };
}

export const getElementSchema: Tool = {
  def: {
    name: "get_element_schema",
    description:
      "Return the full field schema + examples for a component. Use this to generate valid JSON — shows every required/optional field, types, and enum values.",
    inputSchema: {
      type: "object",
      properties: {
        clusterId: {
          type: "string",
          description: "e.g. 'element.heading', 'section.contentBlock', 'trigger.assetTogglePlay'",
        },
      },
      required: ["clusterId"],
    },
  },
  run: async (args) => {
    const { clusterId } = args as { clusterId: string };
    const entry = findCluster(clusterId);
    if (!entry) throw new Error(`Catalog entry not found: ${clusterId}`);
    const schema = SCHEMA_REGISTRY[entry.schema_ref];
    if (!schema) throw new Error(`No schema found for ${entry.schema_ref}`);
    const shape = (schema as AnySchema).shape ?? (schema as AnySchema).def?.shape;
    if (!shape) throw new Error(`Schema ${entry.schema_ref} is not object-shaped`);

    const fields = Object.fromEntries(
      Object.entries(shape)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, describeField(value as AnySchema)])
    );

    return {
      clusterId,
      schemaRef: entry.schema_ref,
      fields,
      notes: [
        "Motion sub-fields (including whileHover and whileTap) live inside `motion`, not at element root.",
      ],
    };
  },
};
