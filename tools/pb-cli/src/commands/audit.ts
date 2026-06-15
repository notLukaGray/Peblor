import fs from "node:fs";
import path from "node:path";
import { loadPeblorByPathAsync, discoverAllPages, PAGE_DATA_DIR } from "@pb/core/loader";
import { PageContentValidationError } from "@pb/core";
import type { ZodIssue } from "zod";
import { findPagesDir, findPageFile } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditArgs = {
  route?: string;
  all: boolean;
  asJson: boolean;
  help: boolean;
};

type AuditIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  file: string;
  line: number;
  path: string;
};

type PageAuditResult = {
  route: string;
  file: string;
  valid: boolean;
  issues: AuditIssue[];
};

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseAuditArgs(args: string[]): AuditArgs {
  const asJson = args.includes("--json");
  const all = args.includes("--all");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--all", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }
  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], all, asJson, help };
}

// ---------------------------------------------------------------------------
// Source location resolution
//
// The pipeline merges sidecar section files into the flat definitions dict.
// After the merge, Zod validates the composed object and issues paths like:
//   ["definitions", "hero", "elements", 0, "type"]
//
// We resolve back to the source file as follows:
//   1. If the path starts with ["definitions", <key>, ...] and a sidecar file
//      exists at <page-dir>/<key>.json, report that sidecar file.
//   2. Otherwise report the page index.json.
//
// For line numbers we do a targeted string search in the raw file text:
//   - Take the LAST meaningful key from the path (the deepest property name)
//   - Find its first occurrence in the file as a JSON key `"keyName":`
//   - Return the line number at that position
//
// This is O(n) per diagnostic on file size, but perfectly acceptable for
// authoring-time audit runs on files that rarely exceed a few thousand lines.
//
// NOTE: The pipeline (loadPeblorByPathAsync / PageContentValidationError) does
// not carry file-path or line-number information in its ZodIssue list — it
// only provides JSON property paths. The attributions below are best-effort:
//   - Sidecar file detection is exact (file exists check).
//   - Line numbers are approximate: we find the first occurrence of the
//     deepest key name in the file, which points to the right neighborhood
//     but may be off by a few lines for repeated key names.
// ---------------------------------------------------------------------------

/**
 * Find the 1-based line number of the first occurrence of a JSON key in raw text.
 * Searches for `"keyName"` to avoid matching value strings that happen to equal
 * the key name.
 *
 * Returns 1 if the key is not found (safe fallback).
 */
function findKeyLine(rawText: string, keyName: string): number {
  const pattern = `"${keyName}"`;
  const idx = rawText.indexOf(pattern);
  if (idx === -1) return 1;
  // Count newlines before this position
  let line = 1;
  for (let i = 0; i < idx; i++) {
    if (rawText[i] === "\n") line++;
  }
  return line;
}

/**
 * Derive the most useful key to search for from a Zod issue path.
 * Strategy: walk from the deepest part of the path upward, take the first
 * string segment (skipping array indices and "$" sentinel). Returns null if
 * nothing useful is found.
 */
function extractSearchKey(pathParts: readonly (string | number)[]): string | null {
  for (let i = pathParts.length - 1; i >= 0; i--) {
    const part = pathParts[i];
    if (typeof part === "string" && part !== "$" && part.length > 0) return part;
  }
  return null;
}

/**
 * Format a ZodIssue path as a JSON-path string: $.definitions.hero.elements[0].type
 */
function formatZodPath(pathParts: readonly (string | number)[]): string {
  if (pathParts.length === 0) return "$";
  let result = "$";
  for (const part of pathParts) {
    if (typeof part === "number") {
      result += `[${part}]`;
    } else {
      result += `.${part}`;
    }
  }
  return result;
}

type SourceLocation = {
  /** Absolute path to the file that contains the issue. */
  absoluteFile: string;
  /** Path relative to repo root (for display). */
  relativeFile: string;
  /** 1-based line number; 1 if we couldn't locate it precisely. */
  line: number;
};

/**
 * Map a ZodIssue path to its source file and line number.
 *
 * The path for a definition error looks like: ["definitions", sectionKey, ...rest]
 * If a sidecar file for sectionKey exists alongside index.json, the error
 * originated there. Otherwise it's in index.json itself.
 */
function resolveSourceLocation(
  issue: ZodIssue,
  indexJsonPath: string,
  slugSegments: string[]
): SourceLocation {
  const repoRoot = process.cwd();
  const pathParts = issue.path as readonly (string | number)[];

  // Determine which file to attribute the error to.
  let targetFile = indexJsonPath;

  const isDefinitionPath =
    pathParts.length >= 2 && pathParts[0] === "definitions" && typeof pathParts[1] === "string";

  if (isDefinitionPath) {
    const sectionKey = pathParts[1] as string;
    // Check if a sidecar file exists for this section key
    const pageDir = path.join(PAGE_DATA_DIR, ...slugSegments);
    const sidecarPath = path.join(pageDir, `${sectionKey}.json`);
    if (fs.existsSync(sidecarPath)) {
      targetFile = sidecarPath;
    }
  }

  // Now find the line number
  let line = 1;
  const searchKey = extractSearchKey(pathParts);
  if (searchKey !== null) {
    try {
      const rawText = fs.readFileSync(targetFile, "utf8");
      line = findKeyLine(rawText, searchKey);
    } catch {
      // If we can't read the file, line stays at 1
    }
  }

  const relativeFile = path.relative(repoRoot, targetFile);

  return { absoluteFile: targetFile, relativeFile, line };
}

// ---------------------------------------------------------------------------
// Single-page audit
// ---------------------------------------------------------------------------

/**
 * Audit a single page by slug segments.
 *
 * Uses `loadPeblorByPathAsync` — the same hydrate→expand→validate cycle the
 * runtime uses. No false positives from validating pre-expand shapes.
 *
 * On success: returns empty issues array (valid: true).
 * On failure: maps PageContentValidationError.issues to AuditIssue[] with
 * source file + line number attribution.
 */
async function auditPageBySlug(
  slugSegments: string[],
  indexJsonPath: string
): Promise<{ valid: boolean; issues: AuditIssue[] }> {
  try {
    await loadPeblorByPathAsync(slugSegments);
    return { valid: true, issues: [] };
  } catch (err) {
    if (err instanceof PageContentValidationError) {
      const issues: AuditIssue[] = err.issues.map((zodIssue) => {
        const loc = resolveSourceLocation(zodIssue, indexJsonPath, slugSegments);
        const jsonPath = formatZodPath(zodIssue.path as readonly (string | number)[]);
        return {
          severity: "error" as const,
          code:
            typeof (zodIssue as { code?: unknown }).code === "string"
              ? (zodIssue as { code: string }).code
              : "PB_SCHEMA_ISSUE",
          message: zodIssue.message,
          file: loc.relativeFile,
          line: loc.line,
          path: jsonPath,
        };
      });
      return { valid: false, issues };
    }

    // Non-validation error (IO error, missing preset, etc.) — surface as a single issue
    const message = err instanceof Error ? err.message : String(err);
    const relFile = path.relative(process.cwd(), indexJsonPath);
    return {
      valid: false,
      issues: [
        {
          severity: "error",
          code: "PB_LOAD_ERROR",
          message,
          file: relFile,
          line: 1,
          path: "$",
        },
      ],
    };
  }
}

/**
 * Derive slug segments from an absolute path to index.json.
 * E.g. /abs/path/content/pages/work/project/index.json → ["work", "project"]
 */
function slugSegmentsFromIndexPath(indexJsonPath: string): string[] | null {
  const absPath = path.resolve(indexJsonPath);
  const absPageDir = path.resolve(PAGE_DATA_DIR);
  if (!absPath.startsWith(absPageDir + path.sep)) return null;
  const rel = absPath.slice(absPageDir.length + 1).replace(/\\/g, "/");
  if (!rel.endsWith("/index.json")) return null;
  const segments = rel
    .replace(/\/index\.json$/, "")
    .split("/")
    .filter(Boolean);
  return segments.length > 0 ? segments : null;
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function formatIssueHuman(issue: AuditIssue): string {
  return (
    `    ${issue.file}:${issue.line} [${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}\n` +
    `      at ${issue.path}`
  );
}

// ---------------------------------------------------------------------------
// Main command handler
// ---------------------------------------------------------------------------

export async function runAudit(args: string[], io: CommandIo): Promise<number> {
  const { route, all, asJson, help } = parseAuditArgs(args);

  if (help) {
    io.printText("Usage: pb-cli audit <route|--all> [--json]");
    io.printText("");
    io.printText(
      "Validates pages through the full pipeline (presets, modules, section hydration, schema checks)."
    );
    io.printText("Reports errors down to specific file paths and line numbers.");
    io.printText("");
    io.printText("  --all    Audit every page in content/pages/");
    io.printText("  --json   Machine-readable JSON output");
    return 0;
  }

  if (!route && !all) {
    io.printErrorText("Error: provide a route or --all.");
    io.printText("Usage: pb-cli audit <route|--all> [--json]");
    return 2;
  }

  const results: PageAuditResult[] = [];

  if (all) {
    // Use discoverAllPages from core/loader — same discovery as the runtime.
    const allPages = await discoverAllPages();
    for (const page of allPages) {
      const r = await auditPageBySlug(page.slugSegments, page.contentPath);
      const routeStr = "/" + page.slugSegments.join("/");
      results.push({
        route: routeStr,
        file: path.relative(process.cwd(), page.contentPath),
        valid: r.valid,
        issues: r.issues,
      });
    }
  } else {
    // Single page lookup
    const pagesDir = findPagesDir();
    if (!pagesDir) {
      const msg = "content/pages not found. Run from the project root.";
      if (asJson) io.printErrorJson({ command: "audit", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }

    const file = findPageFile(pagesDir, route!);
    if (!file) {
      const msg = `Page not found: ${route}`;
      if (asJson) io.printErrorJson({ command: "audit", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }

    const slugSegments = slugSegmentsFromIndexPath(file);
    if (!slugSegments) {
      const msg = `Cannot derive slug segments from path: ${file}`;
      if (asJson) io.printErrorJson({ command: "audit", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }

    const r = await auditPageBySlug(slugSegments, file);
    results.push({
      route: route!,
      file: path.relative(process.cwd(), file),
      valid: r.valid,
      issues: r.issues,
    });
  }

  const totalIssues = results.reduce((n, r) => n + r.issues.length, 0);
  const validCount = results.filter((r) => r.valid).length;

  if (asJson) {
    const payload = {
      command: "audit",
      mode: "strict-load",
      total: results.length,
      valid: validCount,
      failed: results.length - validCount,
      totalIssues,
      pages: Object.fromEntries(
        results.map((r) => [
          r.route,
          {
            file: r.file,
            valid: r.valid,
            issueCount: r.issues.length,
            issues: r.issues,
          },
        ])
      ),
    };
    io.printJson(payload);
  } else {
    const failed = results.length - validCount;
    io.printText(
      `Audit (strict-load): ${validCount}/${results.length} pages valid` +
        (failed > 0 ? ` — ${totalIssues} issue(s) on ${failed} page(s)` : "")
    );
    for (const r of results) {
      if (r.issues.length === 0) continue;
      io.printText(`  ${r.route}  (${r.file})`);
      for (const issue of r.issues) {
        io.printText(formatIssueHuman(issue));
      }
    }
    if (totalIssues === 0) io.printText("  (no issues found)");
  }

  return totalIssues > 0 ? 1 : 0;
}
