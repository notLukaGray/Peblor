import type { z } from "zod";

export type StandardDiagnostic = {
  severity: "error";
  code: string;
  path: string;
  message: string;
};

export function formatIssuePath(path: Array<string | number | symbol>): string {
  return path.length === 0 ? "$" : `$.${path.map((p) => String(p)).join(".")}`;
}

export function mapZodIssues(error: z.ZodError, code: string): StandardDiagnostic[] {
  return error.issues.map((issue) => ({
    severity: "error" as const,
    code,
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));
}
