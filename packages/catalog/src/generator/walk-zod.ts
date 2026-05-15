/**
 * Zod 4 schema introspection for the catalog generator.
 *
 * Derives field metadata from a ZodObject and cross-checks that every field
 * listed in intent axes actually exists on the schema. Hard fail on typos.
 *
 * Used for axis/schema cross-checking and field metadata extraction.
 * Catalog output can consume this metadata as needed.
 */

import { z } from "zod";

export interface FieldMetadata {
  name: string;
  typeTag: string;
  enumValues?: string[];
  optional: boolean;
  responsive: boolean;
}

type AnySchema = z.ZodType & {
  def?: { type?: string; in?: AnySchema; items?: AnySchema[] };
  shape?: Record<string, AnySchema>;
  options?: AnySchema[] | string[];
  unwrap?: () => AnySchema;
  values?: Set<unknown>;
};

function defType(schema: AnySchema): string {
  return (schema as AnySchema).def?.type ?? "unknown";
}

/** Walk a ZodObject shape and return FieldMetadata for every key. */
export function walkZodShape(schema: z.ZodType): Record<string, FieldMetadata> {
  const s = schema as AnySchema;

  // In Zod 4, .refine()/.superRefine() wraps in a pipe. Unwrap the input side.
  let target = s;
  if (defType(target) === "pipe" && target.def?.in) {
    target = target.def.in;
  }
  if (defType(target) === "optional" && typeof target.unwrap === "function") {
    target = target.unwrap();
  }

  if (defType(target) !== "object" || !target.shape) {
    throw new Error(
      `walkZodShape: expected ZodObject, got "${defType(target)}". ` +
        "Ensure the schema_ref resolves to a ZodObject (or ZodPipe wrapping one)."
    );
  }

  const result: Record<string, FieldMetadata> = {};
  for (const [name, field] of Object.entries(target.shape)) {
    result[name] = analyzeField(name, field);
  }
  return result;
}

/**
 * Verify that every field listed in each axis exists in the schema shape.
 * Returns a list of error strings (empty = no errors).
 */
export function crossCheckAxes(
  axes: Array<{ name: string; fields: string[] }>,
  shapeFields: Record<string, FieldMetadata>
): string[] {
  const errors: string[] = [];
  for (const axis of axes) {
    for (const fieldName of axis.fields) {
      if (!(fieldName in shapeFields)) {
        errors.push(`axis "${axis.name}": field "${fieldName}" does not exist on the schema`);
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function analyzeField(name: string, field: AnySchema): FieldMetadata {
  let current = field;
  let optional = false;
  let responsive = false;

  // Unwrap optional (Zod 4: def.type === "optional", unwrap() gives inner)
  if (defType(current) === "optional" && current.unwrap) {
    optional = true;
    current = current.unwrap();
  }

  // Detect responsive pattern: union[T, tuple[T, T]]
  if (defType(current) === "union") {
    const opts = current.options as AnySchema[] | undefined;
    if (opts && opts.length === 2 && defType(opts[1]!) === "tuple") {
      const tupleItems = (opts[1] as AnySchema).def?.items ?? [];
      if (tupleItems.length === 2) {
        responsive = true;
        current = opts[0]!;
      }
    }
  }

  const typeTag = resolveTypeTag(current);
  const enumValues = resolveEnumValues(current);

  return { name, typeTag, enumValues, optional, responsive };
}

function resolveTypeTag(schema: AnySchema): string {
  const type = defType(schema);
  switch (type) {
    case "string":
    case "number":
    case "boolean":
    case "object":
    case "array":
    case "tuple":
    case "union":
    case "enum":
    case "literal":
    case "record":
      return type;
    default:
      return type ?? "unknown";
  }
}

function resolveEnumValues(schema: AnySchema): string[] | undefined {
  const type = defType(schema);
  if (type === "enum") {
    const opts = schema.options;
    if (Array.isArray(opts) && opts.every((o) => typeof o === "string")) {
      return opts as string[];
    }
  }
  if (type === "union") {
    const opts = schema.options as AnySchema[] | undefined;
    if (opts?.every((o) => defType(o) === "literal")) {
      return opts.map((o) => {
        const v = o.values;
        if (v instanceof Set) {
          if (v.size === 0) return "";
          return String([...v][0]);
        }
        return String(v);
      });
    }
  }
  return undefined;
}
