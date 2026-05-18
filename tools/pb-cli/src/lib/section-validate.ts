import { z } from "zod";
import {
  sectionContentBlockSchema,
  sectionScrollContainerSchema,
  sectionColumnBaseSchema,
  sectionRevealSchema,
  sectionDividerSchema,
  sectionFormBlockSchema,
  sectionTriggerSchema,
  sectionDefinitionBlockSchema,
} from "@pb/contracts";

export type SectionDiagnostic = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

const SECTION_SCHEMA_BY_TYPE: Record<string, z.ZodTypeAny> = {
  contentBlock: sectionContentBlockSchema,
  scrollContainer: sectionScrollContainerSchema,
  sectionColumn: sectionColumnBaseSchema,
  revealSection: sectionRevealSchema,
  divider: sectionDividerSchema,
  formBlock: sectionFormBlockSchema,
  sectionTrigger: sectionTriggerSchema,
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

  const typeValue =
    record && typeof (record as Record<string, unknown>).type === "string"
      ? ((record as Record<string, unknown>).type as string)
      : undefined;
  const schema = typeValue ? SECTION_SCHEMA_BY_TYPE[typeValue] : undefined;
  const parsed = schema ? schema.safeParse(value) : sectionDefinitionBlockSchema.safeParse(value);

  if (!parsed.success) {
    diagnostics.push(...zodToDiagnostics(parsed.error, "PB_SECTION_INVALID"));
  }

  return {
    valid: diagnostics.length === 0,
    schema: schema ? `${typeValue}Schema` : "sectionDefinitionBlockSchema",
    diagnostics,
  };
}
