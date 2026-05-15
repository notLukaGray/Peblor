import type { ZodIssue } from "zod";

export class PageContentValidationError extends Error {
  readonly slug: string;
  readonly issues: readonly ZodIssue[];

  constructor(slug: string, issues: readonly ZodIssue[]) {
    super(`page content validation failed for "${slug}" (${issues.length} issues)`);
    this.name = "PageContentValidationError";
    this.slug = slug;
    this.issues = issues;
  }

  format(): string {
    return this.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
  }
}
