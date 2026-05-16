import { findPagesDir, findPageFile, walkPages, readPageJson, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type LintArgs = {
  route?: string;
  all: boolean;
  asJson: boolean;
  help: boolean;
};

type LintWarning = {
  code: string;
  message: string;
  path?: string;
};

function parseArgs(args: string[]): LintArgs {
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

function lintPage(data: Record<string, unknown>): LintWarning[] {
  const warnings: LintWarning[] = [];
  const defs = isRecord(data.definitions) ? data.definitions : {};
  const sectionOrder = Array.isArray(data.sectionOrder) ? (data.sectionOrder as string[]) : [];

  // Warn: no description
  if (!data.description || data.description === "") {
    warnings.push({ code: "missing-description", message: "Page has no description." });
  }

  // Warn: density set but check if it looks intentional (non-default values are fine, just flag if 0)
  if (data.density === 0) {
    warnings.push({
      code: "zero-density",
      message: "density is 0 — likely unintentional (omit for default).",
      path: "density",
    });
  }

  function lintNode(node: unknown, pathSegments: string[]): void {
    if (Array.isArray(node)) {
      node.forEach((item, i) => lintNode(item, [...pathSegments, String(i)]));
      return;
    }
    if (!isRecord(node)) return;

    const nodeType = typeof node.type === "string" ? node.type : "";
    const nodePath = pathSegments.join(".");

    // Warn: image with no alt text
    if (nodeType === "elementImage" && (!node.alt || node.alt === "")) {
      warnings.push({
        code: "image-missing-alt",
        message: `Image element has no alt text.`,
        path: nodePath,
      });
    }

    // Warn: elementHeading or elementText with empty text
    if (
      (nodeType === "elementHeading" || nodeType === "elementText") &&
      (!node.text || node.text === "")
    ) {
      warnings.push({
        code: "empty-text-field",
        message: `"${nodeType}" has empty text field.`,
        path: nodePath,
      });
    }

    // Warn: contentBlock section with no elements
    if (
      nodeType === "contentBlock" &&
      Array.isArray(node.elementOrder) &&
      (node.elementOrder as unknown[]).length === 0
    ) {
      warnings.push({
        code: "empty-section",
        message: `Section "${pathSegments.at(-1)}" has no elements in elementOrder.`,
        path: nodePath,
      });
    }

    for (const [key, value] of Object.entries(node)) {
      lintNode(value, [...pathSegments, key]);
    }
  }

  // Walk all definitions
  for (const [key, def] of Object.entries(defs)) {
    lintNode(def, ["definitions", key]);
  }

  // Warn: forcedTheme on a section that doesn't need it
  if (data.forcedTheme !== undefined) {
    warnings.push({
      code: "forced-theme-set",
      message: `forcedTheme is set to "${data.forcedTheme}". Verify this is intentional.`,
      path: "forcedTheme",
    });
  }

  // Warn: empty sectionOrder
  if (sectionOrder.length === 0) {
    warnings.push({
      code: "empty-section-order",
      message: "Page has no sections in sectionOrder.",
    });
  }

  return warnings;
}

export async function runLint(args: string[], io: CommandIo): Promise<number> {
  const { route, all, asJson, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli lint <route|--all> [--json]");
    io.printText(
      "\nStyle and quality warnings: empty fields, missing alt text, empty sections, etc."
    );
    return 0;
  }

  if (!route && !all) {
    io.printErrorText("Error: provide a route or --all.");
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "lint", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  type PageResult = { route: string; file: string; warnings: LintWarning[] };
  const results: PageResult[] = [];

  if (all) {
    for (const { route: r, file } of walkPages(pagesDir)) {
      const read = readPageJson(file);
      if (!read.ok) continue;
      results.push({ route: r, file, warnings: lintPage(read.data) });
    }
  } else {
    const file = findPageFile(pagesDir, route!);
    if (!file) {
      const msg = `Page not found: ${route}`;
      if (asJson) io.printErrorJson({ command: "lint", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }
    const read = readPageJson(file);
    if (!read.ok) {
      if (asJson) io.printErrorJson({ command: "lint", status: "error", message: read.error });
      else io.printErrorText(`Error: ${read.error}`);
      return 1;
    }
    results.push({ route: route!, file, warnings: lintPage(read.data) });
  }

  const totalWarnings = results.reduce((n, r) => n + r.warnings.length, 0);

  if (asJson) {
    io.printJson({
      command: "lint",
      totalWarnings,
      pages: Object.fromEntries(
        results.map((r) => [
          r.route,
          { file: r.file, warningCount: r.warnings.length, warnings: r.warnings },
        ])
      ),
    });
  } else {
    io.printText(`Lint: ${totalWarnings} warning(s) across ${results.length} page(s)`);
    for (const { route: r, warnings } of results) {
      if (warnings.length === 0) continue;
      io.printText(`  ${r}`);
      for (const w of warnings) {
        const loc = w.path ? ` @ ${w.path}` : "";
        io.printText(`    [WARN] ${w.code}${loc}: ${w.message}`);
      }
    }
    if (totalWarnings === 0) io.printText("  (no warnings)");
  }

  return totalWarnings > 0 ? 1 : 0;
}
