import { elementBlockSchema } from "@pb/contracts";
import { mapZodIssues } from "./zod-diagnostics.js";

export type ElementDiagnostic = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

export function validateElementValue(value: unknown): {
  valid: boolean;
  schema: string;
  diagnostics: ElementDiagnostic[];
} {
  const parsed = elementBlockSchema.safeParse(value);
  if (parsed.success) return { valid: true, schema: "elementBlockSchema", diagnostics: [] };
  return {
    valid: false,
    schema: "elementBlockSchema",
    diagnostics: mapZodIssues(parsed.error, "PB_ELEMENT_INVALID"),
  };
}
