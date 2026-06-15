import { discoverAllPages, loadPeblorByPathAsync, getChangedSlugs } from "@pb/core/loader";
import type { CommandIo } from "./types.js";

const DEFAULT_BASE_REF =
  (process.env["VALIDATE_PAGES_BASE_REF"] as string | undefined) ?? "origin/main";

type ValidateAllArgs = {
  failFast: boolean;
  asJson: boolean;
  changed: boolean;
  baseRef: string;
  help: boolean;
};

function parseArgs(args: string[]): ValidateAllArgs {
  const baseIndex = args.indexOf("--base");
  return {
    failFast: args.includes("--fail-fast"),
    asJson: args.includes("--json"),
    changed: args.includes("--changed"),
    baseRef: baseIndex >= 0 ? (args[baseIndex + 1] ?? DEFAULT_BASE_REF) : DEFAULT_BASE_REF,
    help: args.includes("--help") || args.includes("-h"),
  };
}

export async function runValidateAll(args: string[], io: CommandIo): Promise<number> {
  const { failFast, asJson, changed, baseRef, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli validate-all [--changed [--base <ref>]] [--fail-fast] [--json]");
    io.printText(
      "\nStrict-loads every page through the full route-aware pipeline (presets, modules, section hydration, cross-ref checks)."
    );
    io.printText("Equivalent to the CI validate-all-pages.ts script.");
    io.printText("");
    io.printText(
      "  --changed       Only validate pages touched since the merge base of BASE_REF and HEAD."
    );
    io.printText(
      `  --base <ref>    Git base ref for --changed (default: ${DEFAULT_BASE_REF}, override with VALIDATE_PAGES_BASE_REF).`
    );
    return 0;
  }

  const allPages = await discoverAllPages();

  type PageResult = {
    route: string;
    valid: boolean;
    error?: string;
  };

  let pagesToValidate = allPages;
  let changedNote: string | undefined;

  if (changed) {
    const changedSlugs = getChangedSlugs(allPages, baseRef);
    if (changedSlugs.size === 0) {
      const msg = `--changed: no changed content pages detected vs ${baseRef}.`;
      if (asJson) {
        io.printJson({
          command: "validate-all",
          mode: "strict-load",
          changed: true,
          baseRef,
          total: 0,
          valid: 0,
          failed: 0,
          pages: {},
          note: msg,
        });
      } else {
        io.printText(msg);
      }
      return 0;
    }
    pagesToValidate = allPages.filter((p) => changedSlugs.has(p.slugSegments.join("/")));
    changedNote = `--changed: comparing against "${baseRef}" — ${pagesToValidate.length} page(s) to validate.`;
    if (!asJson) io.printText(changedNote);
  }

  const results: PageResult[] = [];
  let anyFailed = false;

  for (const page of pagesToValidate) {
    const route = page.slugSegments.join("/") || "/";
    try {
      await loadPeblorByPathAsync(page.slugSegments);
      results.push({ route, valid: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      results.push({ route, valid: false, error });
      anyFailed = true;
      if (failFast) break;
    }
  }

  const validCount = results.filter((r) => r.valid).length;
  const failedCount = results.filter((r) => !r.valid).length;

  if (asJson) {
    const payload = {
      command: "validate-all",
      mode: "strict-load",
      ...(changed ? { changed: true, baseRef } : {}),
      total: results.length,
      valid: validCount,
      failed: failedCount,
      pages: Object.fromEntries(
        results.map((r) => [r.route, { valid: r.valid, ...(r.error ? { error: r.error } : {}) }])
      ),
    };
    if (anyFailed) io.printErrorJson(payload);
    else io.printJson(payload);
  } else {
    io.printText(`validate-all: ${validCount}/${results.length} pages passed strict-load`);
    for (const r of results.filter((r) => !r.valid)) {
      io.printText(`  FAIL /${r.route}`);
      if (r.error) io.printText(`    ERROR ${r.error}`);
    }
    if (!anyFailed) io.printText("  All pages valid.");
  }

  return anyFailed ? 1 : 0;
}
