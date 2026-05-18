import { moduleBlockSchema } from "@pb/contracts";
import { mapZodIssues } from "./zod-diagnostics.js";

export type ModuleDiagnostic = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

export function validateModuleValue(value: unknown): {
  valid: boolean;
  schema: string;
  diagnostics: ModuleDiagnostic[];
} {
  const parsed = moduleBlockSchema.safeParse(value);
  if (parsed.success) return { valid: true, schema: "moduleBlockSchema", diagnostics: [] };
  return {
    valid: false,
    schema: "moduleBlockSchema",
    diagnostics: mapZodIssues(parsed.error, "PB_MODULE_INVALID"),
  };
}
