import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { peblorSchema } from "@pb/contracts/peblor/core/peblor-schemas";
import {
  loadPeblorAsync,
  loadPeblorByPathAsync,
  PAGE_DATA_DIR as CORE_PAGE_DATA_DIR,
  CONTENT_DIR as CORE_CONTENT_DIR,
} from "@pb/core/loader";
import { discoverAllPages } from "@pb/core/loader";
import { computeFallbackStatsFromPageDefinitions } from "@/peblor/dev/compute-figma-fallback-walk";
import {
  parseFigmaExportDiagnostics,
  type FigmaExportDiagnosticsV1,
} from "@/peblor/dev/figma-export-diagnostics-store";

export interface ValidationResult {
  slug: string;
  valid: boolean;
  errors: string[];
}

type IssuePathPart = string | number | symbol;

type FlattenedIssue = {
  code: string;
  path: string;
  message: string;
  branchTrail: string[];
};

const PAGE_DATA_DIR = CORE_PAGE_DATA_DIR ?? path.join(CORE_CONTENT_DIR ?? process.cwd(), "pages");

async function getAllPageSlugs(): Promise<string[]> {
  return (await discoverAllPages()).map(({ slugSegments }) => slugSegments.join("/"));
}

export interface RunValidationOptions {
  slugs?: string[];
}

export async function runPeblorValidation(
  options: RunValidationOptions = {}
): Promise<ValidationResult[]> {
  const slugs = options.slugs && options.slugs.length > 0 ? options.slugs : await getAllPageSlugs();
  if (!slugs.length) return [];
  return Promise.all(slugs.map((slug) => validatePage(slug)));
}

async function validatePage(slug: string): Promise<ValidationResult> {
  const segments = slug.split("/").filter(Boolean);
  const page =
    segments.length > 1 ? await loadPeblorByPathAsync(segments) : await loadPeblorAsync(slug);
  if (!page) {
    return { slug, valid: false, errors: ["Page file not found or could not be loaded"] };
  }
  const result = peblorSchema.safeParse(page);
  if (result.success) return { slug, valid: true, errors: [] };
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const issue of result.error.issues) {
    for (const detail of flattenZodIssue(issue, [], [], page)) {
      const sourceHint = getSourceHint(slug, detail.path);
      const key = `${detail.code}|${detail.path}|${detail.message}|${detail.branchTrail.join(">")}|${sourceHint ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const pathPrefix = detail.path ? `${detail.path}: ` : "";
      const codePrefix = `[${detail.code}] `;
      const branchPrefix =
        detail.branchTrail.length > 0 ? `${detail.branchTrail.join(" > ")}: ` : "";
      const sourceSuffix = sourceHint ? ` (${sourceHint})` : "";
      errors.push(`${pathPrefix}${codePrefix}${branchPrefix}${detail.message}${sourceSuffix}`);
    }
  }
  return { slug, valid: false, errors };
}

function flattenZodIssue(
  issue: z.ZodIssue,
  inheritedPath: IssuePathPart[] = [],
  branchTrail: string[] = [],
  rootValue?: unknown
): FlattenedIssue[] {
  const fullPath = [...inheritedPath, ...issue.path];

  if (issue.code === "invalid_union" && "unionErrors" in issue) {
    const unionIssue = issue as z.ZodIssue & {
      unionErrors: ReadonlyArray<{ issues: z.ZodIssue[] }>;
    };
    const nested = unionIssue.unionErrors.flatMap(
      (unionError: { issues: z.ZodIssue[] }, index: number) =>
        unionError.issues.flatMap((nestedIssue: z.ZodIssue) =>
          flattenZodIssue(nestedIssue, fullPath, [...branchTrail, `union[${index}]`], rootValue)
        )
    );
    if (nested.length > 0) return nested;
  }

  const metadata = formatIssueMetadata(issue);
  const hasPath = fullPath.length > 0;
  const currentValue =
    rootValue !== undefined && hasPath
      ? getValueAtPath(
          rootValue,
          fullPath.map((p) => String(p))
        )
      : undefined;
  const currentValuePart = hasPath
    ? `current=${
        currentValue === undefined
          ? "undefined (likely missing in JSON)"
          : safeJsonStringify(currentValue)
      }`
    : null;

  const metaParts = [metadata, currentValuePart].filter((p) => p && p.length > 0) as string[];
  const metaString = metaParts.length > 0 ? ` (${metaParts.join(", ")})` : "";
  const message = (issue.message || "Validation failed") + metaString;

  return [
    {
      code: issue.code,
      path: fullPath.map((p) => String(p)).join("."),
      message,
      branchTrail,
    },
  ];
}

function getValueAtPath(root: unknown, pathParts: string[]): unknown {
  let current: unknown = root;

  for (const part of pathParts) {
    if (current == null) return undefined;

    const isArrayIndex = Number.isInteger(Number(part));
    if (isArrayIndex) {
      if (!Array.isArray(current)) return undefined;
      const index = Number(part);
      current = current[index];
    } else if (typeof current === "object") {
      const record = current as Record<string, unknown>;
      current = record[part];
    } else {
      return undefined;
    }
  }

  return current;
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatIssueMetadata(issue: z.ZodIssue): string | null {
  const parts: string[] = [];
  const i = issue as unknown as Record<string, unknown>;
  if (typeof i.expected === "string") parts.push(`expected=${i.expected}`);
  if (typeof i.received === "string") parts.push(`received=${i.received}`);
  if (typeof i.discriminator === "string") parts.push(`discriminator=${i.discriminator}`);
  if (Array.isArray(i.values) && i.values.length > 0) {
    const values = i.values.map((v) => JSON.stringify(v)).join("|");
    parts.push(`allowed=${values}`);
  }
  if (typeof i.minimum === "number") parts.push(`minimum=${i.minimum}`);
  if (typeof i.maximum === "number") parts.push(`maximum=${i.maximum}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

function getSourceHint(slug: string, errorPath: string): string | null {
  const parts = errorPath.split(".").filter(Boolean);
  if (parts[0] !== "definitions") return null;
  const topDefinitionKey = parts[1];
  if (!topDefinitionKey) return null;

  const slugSegments = slug.split("/").filter(Boolean);
  const pageDir = path.join(PAGE_DATA_DIR, ...slugSegments);
  const pageDefinitionFile = path.join(pageDir, `${topDefinitionKey}.json`);
  const contentDir = CORE_CONTENT_DIR ?? path.join(process.cwd(), "src/content");
  const moduleFile = path.join(contentDir, "modules", `${topDefinitionKey}.json`);
  const pageFile = path.join(pageDir, "index.json");

  const nestedDefinitionsIndex = parts.findIndex(
    (part, index) => index >= 2 && part === "definitions"
  );
  const nestedDefinitionKey =
    nestedDefinitionsIndex >= 0 ? (parts[nestedDefinitionsIndex + 1] ?? null) : null;

  const sourceFile = fs.existsSync(pageDefinitionFile)
    ? path.relative(process.cwd(), pageDefinitionFile)
    : fs.existsSync(moduleFile)
      ? path.relative(process.cwd(), moduleFile)
      : path.relative(process.cwd(), pageFile);

  if (nestedDefinitionKey) {
    return `source ${sourceFile}, nested definition ${nestedDefinitionKey}`;
  }
  return `source ${sourceFile}`;
}

export function summarizeValidation(results: ValidationResult[]): {
  validCount: number;
  invalidCount: number;
} {
  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid).length;
  return { validCount, invalidCount };
}

// ---------------------------------------------------------------------------
// Figma export diagnostics (dev tooling)
// ---------------------------------------------------------------------------

export type { FigmaExportDiagnosticsV1 };

export interface PageFigmaDiagnosticsSummary {
  /** Present when the page JSON includes `figmaExportDiagnostics` from the Figma plugin. */
  embedded: FigmaExportDiagnosticsV1 | null;
  /** Fallback elements found by scanning `definitions` (subset of exporter `fallback` when trace embedded). */
  scannedFallbackElements: number;
  scannedTopFallbackReasons: Array<{ code: string; count: number }>;
}

/** Non-throwing summary for PB dev overlay and validation scripts. */
export function summarizePageFigmaDiagnostics(page: unknown): PageFigmaDiagnosticsSummary | null {
  if (!page || typeof page !== "object" || Array.isArray(page)) return null;
  const rec = page as Record<string, unknown>;
  const embedded = parseFigmaExportDiagnostics(rec["figmaExportDiagnostics"]);
  const scan = computeFallbackStatsFromPageDefinitions(rec);
  return {
    embedded,
    scannedFallbackElements: scan.fallbackElements,
    scannedTopFallbackReasons: scan.topFallbackReasons,
  };
}
