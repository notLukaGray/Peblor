import { z } from "zod";
import { peblorDefinitionBlockSchema } from "@pb/contracts";

// ---------------------------------------------------------------------------
// Section-fragment validation
//
// A "section fragment" is a JSON file describing a single section definition
// in its AUTHORED shape: elementOrder (string keys) + definitions (flat map).
// This is the shape stored on disk in sidecar files (e.g. hero.json).
//
// We validate against `peblorDefinitionBlockSchema` — the same schema the
// runtime uses for authored definitions in peblorSchema.definitions. This is
// the correct schema for sidecar section files: it accepts the authored shape
// (elementOrder + definitions) rather than the post-expand shape (elements[]).
//
// Do NOT use sectionContentBlockSchema / sectionScrollContainerSchema / etc.
// from section-block-schemas — those are the POST-EXPAND schemas (they expect
// an `elements` array, not `elementOrder`) and will reject every valid sidecar.
// ---------------------------------------------------------------------------

export type SectionDiagnostic = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

const PAGE_ONLY_FIELD_MESSAGES: Record<string, string> = {
  bgKey:
    "bgKey is only valid in page index.json - use a direct fill or layers on the section instead",
  sectionOrder: "sectionOrder is only valid in page index.json, not in section files",
  tags: "tags is only valid in page index.json, not in section files",
};

function issuePath(path: Array<string | number | symbol>): string {
  return path.length === 0 ? "$" : `$.${path.map((p) => String(p)).join(".")}`;
}

function bestUnionIssues(error: z.ZodError): z.ZodIssue[] {
  const all = error.issues.flatMap((issue) => {
    if (issue.code !== "invalid_union") return [issue];
    const nested = (issue as { errors?: z.ZodIssue[][]; unionErrors?: z.ZodError[] }).errors;
    if (Array.isArray(nested) && nested.length > 0) return nested.flat();
    const unionErrors = (issue as { unionErrors?: z.ZodError[] }).unionErrors;
    if (Array.isArray(unionErrors) && unionErrors.length > 0)
      return unionErrors.flatMap((e) => e.issues);
    return [issue];
  });
  if (all.length === 0) return error.issues;
  const maxDepth = Math.max(...all.map((i) => i.path.length));
  const deepest = all.filter((i) => i.path.length === maxDepth);
  return deepest.length > 0 ? deepest : all;
}

function zodToDiagnostics(error: z.ZodError, code: string): SectionDiagnostic[] {
  const issues = bestUnionIssues(error);
  return issues.map((issue) => ({
    severity: "error",
    code,
    path: issuePath(issue.path),
    message: issue.message,
  }));
}

export function validateSectionValue(value: unknown): {
  valid: boolean;
  schema: string;
  diagnostics: SectionDiagnostic[];
} {
  const diagnostics: SectionDiagnostic[] = [];
  const record = value && typeof value === "object" && !Array.isArray(value) ? value : null;
  if (record) {
    for (const [field, message] of Object.entries(PAGE_ONLY_FIELD_MESSAGES)) {
      if (field in (record as Record<string, unknown>)) {
        diagnostics.push({
          severity: "error",
          code: "PB_SECTION_PAGE_ONLY_FIELD",
          path: `$.${field}`,
          message,
        });
      }
    }
  }

  // Validate against peblorDefinitionBlockSchema — the authored-shape schema that accepts
  // both elementOrder+definitions (sidecar section files) and post-expand elements arrays.
  // This is the same schema the runtime uses for page definitions on disk.
  const parsed = peblorDefinitionBlockSchema.safeParse(value);

  if (!parsed.success) {
    diagnostics.push(...zodToDiagnostics(parsed.error, "PB_SECTION_INVALID"));
  }

  return {
    valid: diagnostics.length === 0,
    schema: "peblorDefinitionBlockSchema",
    diagnostics,
  };
}
