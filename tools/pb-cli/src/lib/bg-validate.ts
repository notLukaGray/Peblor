import { bgBlockSchema } from "@pb/contracts";
import { mapZodIssues } from "./zod-diagnostics.js";

export type BgDiagnostic = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

export function validateBgValue(value: unknown): {
  valid: boolean;
  schema: string;
  diagnostics: BgDiagnostic[];
} {
  const parsed = bgBlockSchema.safeParse(value);
  if (parsed.success) return { valid: true, schema: "bgBlockSchema", diagnostics: [] };
  return {
    valid: false,
    schema: "bgBlockSchema",
    diagnostics: mapZodIssues(parsed.error, "PB_BG_INVALID"),
  };
}
