import * as fs from "fs";
import * as path from "path";
import { validatePage as validatePageInCore } from "@pb/core";
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
  const result = validatePageInCore(page);
  if (result.valid) return { slug, valid: true, errors: [] };
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const diagnostic of result.diagnostics) {
    const sourceHint = getSourceHint(slug, diagnostic.path);
    const key = `${diagnostic.code}|${diagnostic.path}|${diagnostic.message}|${sourceHint ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pathPrefix = diagnostic.path && diagnostic.path !== "$" ? `${diagnostic.path}: ` : "";
    const codePrefix = `[${diagnostic.code}] `;
    const sourceSuffix = sourceHint ? ` (${sourceHint})` : "";
    errors.push(`${pathPrefix}${codePrefix}${diagnostic.message}${sourceSuffix}`);
  }
  return { slug, valid: false, errors };
}

function getSourceHint(slug: string, errorPath: string): string | null {
  const normalizedPath = errorPath.startsWith("$.") ? errorPath.slice(2) : errorPath;
  const parts = normalizedPath.split(".").filter(Boolean);
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
