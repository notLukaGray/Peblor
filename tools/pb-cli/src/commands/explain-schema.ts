import { z } from "zod";
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
  sectionColumnBaseSchema,
  sectionContentBlockSchema,
  sectionScrollContainerSchema,
  sectionDividerSchema,
  sectionTriggerSchema,
  sectionFormBlockSchema,
  sectionRevealSchema,
  bgBlockSchema,
  moduleBlockSchema,
  modalBuilderSchema,
} from "@pb/contracts";
import type { CatalogEntry } from "@pb/catalog";

type AnySchema = z.ZodType & {
  def?: {
    type?: string;
    in?: AnySchema;
    shape?: Record<string, AnySchema>;
    values?: unknown[] | Set<unknown>;
  };
  options?: AnySchema[];
  shape?: Record<string, AnySchema>;
  unwrap?: () => AnySchema;
};

export type ExplainFieldDetail = {
  field: string;
  type: string;
  optional: boolean;
  enum_values?: string[];
};

function extractDUMember(du: z.ZodType, typeValue: string): z.ZodType | null {
  const opts = (du as AnySchema).options;
  if (!opts) return null;
  for (const opt of opts) {
    const shape = (opt as AnySchema).shape ?? (opt as AnySchema).def?.shape;
    const values = shape?.type?.def?.values;
    if (values instanceof Set && values.has(typeValue)) return opt;
    if (Array.isArray(values) && values.includes(typeValue)) return opt;
  }
  return null;
}

function zodType(schema: AnySchema): string {
  return schema.def?.type ?? "unknown";
}

function unwrapToObject(schema: z.ZodType): AnySchema | null {
  let current = schema as AnySchema;
  if (zodType(current) === "pipe" && current.def?.in) current = current.def.in;
  return zodType(current) === "object" ? current : null;
}

const SCHEMA_REGISTRY: Record<string, z.ZodType | null> = {
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
  elementGroupSchema: extractDUMember(elementBlockSchema, "elementGroup"),
  elementInfiniteScrollSchema: extractDUMember(elementBlockSchema, "elementInfiniteScroll"),
  sectionColumnBaseSchema,
  sectionContentBlockSchema,
  sectionScrollContainerSchema,
  sectionDividerSchema,
  sectionTriggerSchema,
  sectionFormBlockSchema,
  sectionRevealSchema,
  backgroundVideoSchema: extractDUMember(bgBlockSchema, "backgroundVideo"),
  backgroundImageSchema: extractDUMember(bgBlockSchema, "backgroundImage"),
  backgroundVariableSchema: extractDUMember(bgBlockSchema, "backgroundVariable"),
  backgroundPatternSchema: extractDUMember(bgBlockSchema, "backgroundPattern"),
  backgroundTransitionSchema: extractDUMember(bgBlockSchema, "backgroundTransition"),
  moduleBlockSchema,
  modalBuilderSchema,
};

function fieldDetail(field: AnySchema): Omit<ExplainFieldDetail, "field"> {
  let current = field;
  let optional = false;
  if (zodType(current) === "optional" && current.unwrap) {
    optional = true;
    current = current.unwrap();
  }
  let enumValues: string[] | undefined;
  if (
    zodType(current) === "enum" &&
    Array.isArray((current as unknown as { options?: unknown[] }).options)
  ) {
    enumValues = ((current as unknown as { options?: unknown[] }).options ?? []).map((v) =>
      String(v)
    );
  }
  if (zodType(current) === "literal") {
    const vals = current.def?.values;
    if (vals instanceof Set) enumValues = [...vals].map((v) => String(v));
    if (Array.isArray(vals)) enumValues = vals.map((v) => String(v));
  }
  return {
    type: zodType(current),
    optional,
    ...(enumValues?.length ? { enum_values: enumValues } : {}),
  };
}

export function explainFieldDetails(entry: CatalogEntry): ExplainFieldDetail[] {
  const schema = SCHEMA_REGISTRY[entry.schema_ref];
  if (!schema) return [];
  const shape = unwrapToObject(schema)?.shape;
  if (!shape) return [];

  const fields = Array.from(new Set(entry.axes.flatMap((axis) => axis.fields))).sort((a, b) =>
    a.localeCompare(b)
  );
  return fields.map((field) => {
    const schemaField = shape[field];
    return schemaField
      ? { field, ...fieldDetail(schemaField as AnySchema) }
      : { field, type: "missing", optional: false };
  });
}

export function schemaTypeHint(entry: CatalogEntry): string | undefined {
  const schema = (SCHEMA_REGISTRY[entry.schema_ref] ?? undefined) as AnySchema | undefined;
  const typeField = schema
    ? (unwrapToObject(schema)?.shape?.type as AnySchema | undefined)
    : undefined;
  if (!typeField) return undefined;
  const values = typeField.def?.values;
  if (values instanceof Set && values.size > 0) return String([...values][0]);
  if (Array.isArray(values) && values.length > 0) return String(values[0]);
  return undefined;
}
