import {
  bgBlockSchema,
  elementBlockSchema,
  sectionBlockSchema,
  triggerActionSchema,
} from "@pb/contracts";
import { readContentFile } from "../lib/fs.js";
import { MODULES_DIR } from "../lib/paths.js";

type AnySchema = {
  options?: AnySchema[];
  shape?: Record<string, AnySchema>;
  def?: {
    type?: string;
    shape?: Record<string, AnySchema>;
    values?: unknown[] | Set<unknown>;
    innerType?: AnySchema;
  };
  unwrap?: () => AnySchema;
};

function unwrap(schema: AnySchema): { schema: AnySchema; optional: boolean } {
  let current = schema;
  let optional = false;
  while (current.def?.type === "optional" && current.unwrap) {
    optional = true;
    current = current.unwrap();
  }
  return { schema: current, optional };
}

function literalType(option: AnySchema): string | null {
  const shape = option.shape ?? option.def?.shape ?? {};
  const values = shape.type?.def?.values;
  if (values instanceof Set && values.size > 0) return String([...values][0]);
  if (Array.isArray(values) && values.length > 0) return String(values[0]);
  return null;
}

function placeholderFor(schema: AnySchema): unknown {
  const { schema: s } = unwrap(schema);
  const type = s.def?.type;
  if (type === "string") return "";
  if (type === "number") return 0;
  if (type === "boolean") return false;
  if (type === "literal") {
    const values = s.def?.values;
    if (values instanceof Set && values.size > 0) return [...values][0];
    if (Array.isArray(values) && values.length > 0) return values[0];
    return "";
  }
  if (type === "enum") {
    const options = (s as { options?: unknown[] }).options ?? [];
    return options[0] ?? "";
  }
  if (type === "array") return [];
  if (type === "object") {
    const shape = s.shape ?? s.def?.shape ?? {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(shape)) {
      const unwrapped = unwrap(value as AnySchema);
      if (unwrapped.optional) continue;
      out[key] = placeholderFor(value as AnySchema);
    }
    return out;
  }
  if (type === "union") {
    const options = s.options ?? [];
    return options.length > 0 ? placeholderFor(options[0] as AnySchema) : null;
  }
  if (type === "tuple") return [];
  return null;
}

function scaffoldFromDiscriminatedUnion(
  schema: AnySchema,
  type: string
): Record<string, unknown> | null {
  const options = schema.options ?? [];
  const option = options.find((opt) => literalType(opt) === type);
  if (!option) return null;
  const shape = option.shape ?? option.def?.shape ?? {};
  const out: Record<string, unknown> = { type };
  for (const [key, value] of Object.entries(shape)) {
    if (key === "type") continue;
    const unwrapped = unwrap(value as AnySchema);
    if (unwrapped.optional) continue;
    out[key] = placeholderFor(value as AnySchema);
  }
  return out;
}

export function scaffoldElementType(type: string): Record<string, unknown> | null {
  return scaffoldFromDiscriminatedUnion(elementBlockSchema as unknown as AnySchema, type);
}

export function scaffoldBgType(type: string): Record<string, unknown> | null {
  return scaffoldFromDiscriminatedUnion(bgBlockSchema as unknown as AnySchema, type);
}

export function scaffoldSectionType(type: string): Record<string, unknown> | null {
  return scaffoldFromDiscriminatedUnion(sectionBlockSchema as unknown as AnySchema, type);
}

export function scaffoldActionType(type: string): Record<string, unknown> | null {
  return scaffoldFromDiscriminatedUnion(triggerActionSchema as unknown as AnySchema, type);
}

export async function scaffoldModuleType(id: string): Promise<Record<string, unknown> | null> {
  try {
    const value = (await readContentFile(MODULES_DIR, id)) as Record<string, unknown>;
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
