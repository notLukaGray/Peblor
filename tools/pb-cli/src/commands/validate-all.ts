import { findPagesDir, walkPages, readPageJson } from "../lib/pages.js";
import { validatePage } from "@pb/core/validate";
import type { CommandIo } from "./types.js";

type ValidateAllArgs = {
  failFast: boolean;
  asJson: boolean;
  help: boolean;
};

function parseArgs(args: string[]): ValidateAllArgs {
  return {
    failFast: args.includes("--fail-fast"),
    asJson: args.includes("--json"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

export async function runValidateAll(args: string[], io: CommandIo): Promise<number> {
  const { failFast, asJson, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli validate-all [--fail-fast] [--json]");
    io.printText("\nValidates every page and summarizes failures.");
    return 0;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "validate-all", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const allPages = walkPages(pagesDir);

  type PageResult = {
    route: string;
    file: string;
    valid: boolean;
    diagnostics: Array<{ severity: string; path: unknown; message: string }>;
  };

  const results: PageResult[] = [];
  let anyFailed = false;

  for (const { route, file } of allPages) {
    const read = readPageJson(file);
    if (!read.ok) {
      results.push({
        route,
        file,
        valid: false,
        diagnostics: [{ severity: "error", path: null, message: read.error }],
      });
      anyFailed = true;
      if (failFast) break;
      continue;
    }

    const validated = validatePage(read.data);
    const diagnostics = validated.valid
      ? []
      : validated.diagnostics.map((d) => ({
          severity: d.severity,
          path: d.path,
          message: d.message,
        }));
    results.push({ route, file, valid: validated.valid, diagnostics });
    if (!validated.valid) {
      anyFailed = true;
      if (failFast) break;
    }
  }

  const validCount = results.filter((r) => r.valid).length;
  const failedCount = results.filter((r) => !r.valid).length;

  if (asJson) {
    const payload = {
      command: "validate-all",
      total: results.length,
      valid: validCount,
      failed: failedCount,
      pages: Object.fromEntries(
        results.map((r) => [r.route, { file: r.file, valid: r.valid, diagnostics: r.diagnostics }])
      ),
    };
    if (anyFailed) io.printErrorJson(payload);
    else io.printJson(payload);
  } else {
    io.printText(`validate-all: ${validCount}/${results.length} pages valid`);
    for (const r of results.filter((r) => !r.valid)) {
      io.printText(`  FAIL ${r.route}`);
      for (const d of r.diagnostics) {
        io.printText(`    ${d.severity.toUpperCase()} ${d.message}`);
      }
    }
    if (!anyFailed) io.printText("  All pages valid.");
  }

  return anyFailed ? 1 : 0;
}
