import { triggerActionSchema } from "@pb/contracts";
import type { z } from "zod";

type AnySchema = z.ZodTypeAny & {
  def?: { type?: string; shape?: Record<string, AnySchema>; values?: unknown[] | Set<unknown> };
  options?: AnySchema[];
  shape?: Record<string, AnySchema>;
  unwrap?: () => AnySchema;
};

type PayloadField = { key: string; type: string };

export type ActionTypeSummary = {
  type: string;
  payload: PayloadField[];
  description: string;
};

function unwrap(schema: AnySchema): AnySchema {
  let current = schema;
  while (current.def?.type === "optional" && current.unwrap) current = current.unwrap();
  return current;
}

function describe(schema: AnySchema): string {
  const s = unwrap(schema);
  const t = s.def?.type ?? "unknown";
  if (t === "string" || t === "number" || t === "boolean") return t;
  if (t === "literal") {
    const values = s.def?.values;
    const literal =
      values instanceof Set ? [...values][0] : Array.isArray(values) ? values[0] : undefined;
    return `literal(${String(literal)})`;
  }
  if (t === "enum") {
    const values = (s as { options?: string[] }).options ?? [];
    return `enum(${values.join("|")})`;
  }
  if (t === "array") return "array";
  if (t === "object") return "object";
  if (t === "union") return "union";
  return t;
}

function typeValue(option: AnySchema): string | null {
  const shape = option.shape ?? option.def?.shape ?? {};
  const typeNode = shape.type;
  const values = typeNode?.def?.values;
  if (values instanceof Set) return String([...values][0]);
  if (Array.isArray(values) && values.length > 0) return String(values[0]);
  return null;
}

function payloadShape(option: AnySchema): PayloadField[] {
  const shape = option.shape ?? option.def?.shape ?? {};
  const payloadNode = shape.payload;
  if (!payloadNode) return [];
  const payload = unwrap(payloadNode);
  const payloadObjShape = payload.shape ?? payload.def?.shape;
  if (!payloadObjShape) return [{ key: "payload", type: describe(payload) }];
  return Object.entries(payloadObjShape).map(([key, value]) => ({
    key,
    type: describe(value),
  }));
}

export function listActionTypeSummaries(): ActionTypeSummary[] {
  const options = ((triggerActionSchema as AnySchema).options ??
    (triggerActionSchema as unknown as { _def?: { options?: AnySchema[] } })._def?.options ??
    []) as AnySchema[];

  return options
    .map((option) => {
      const type = typeValue(option);
      return type
        ? {
            type,
            payload: payloadShape(option),
            description: "",
          }
        : null;
    })
    .filter((row): row is ActionTypeSummary => row != null)
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function explainActionTypeSummary(actionType: string): ActionTypeSummary | null {
  const all = listActionTypeSummaries();
  return all.find((row) => row.type === actionType) ?? null;
}

function issuePath(path: Array<string | number | symbol>): string {
  return path.length === 0 ? "$" : `$.${path.map((p) => String(p)).join(".")}`;
}

export function validateActionValue(value: unknown): {
  valid: boolean;
  diagnostics: Array<{ severity: "error"; code: string; path: string; message: string }>;
} {
  const parsed = triggerActionSchema.safeParse(value);
  if (parsed.success) return { valid: true, diagnostics: [] };
  return {
    valid: false,
    diagnostics: parsed.error.issues.map((issue) => ({
      severity: "error" as const,
      code: "PB_ACTION_INVALID",
      path: issuePath(issue.path),
      message: issue.message,
    })),
  };
}
