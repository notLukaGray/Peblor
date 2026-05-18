import path from "node:path";
import { findPagesDir, findPageFile, walkPages, readPageJson, isRecord } from "../lib/pages.js";
import { readJsonFile } from "../lib/json-file.js";
import { validateSectionValue } from "../lib/section-validate.js";
import type { CommandIo } from "./types.js";

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
  path?: string;
};

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

function collectInternalHrefs(node: unknown, results: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((item) => collectInternalHrefs(item, results));
    return;
  }
  if (!isRecord(node)) return;
  for (const [key, value] of Object.entries(node)) {
    if (key === "href" && typeof value === "string" && value.startsWith("/")) {
      results.push(value);
    }
    if (
      key === "payload" &&
      isRecord(node) &&
      typeof (node as Record<string, unknown>).type === "string" &&
      (node as Record<string, unknown>).type === "navigate" &&
      isRecord(value) &&
      typeof (value as Record<string, unknown>).href === "string"
    ) {
      const href = (value as Record<string, unknown>).href as string;
      if (href.startsWith("/")) results.push(href);
    }
    collectInternalHrefs(value, results);
  }
}

function auditPage(
  data: Record<string, unknown>,
  knownRoutes: Set<string>,
  pageFile: string
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const definitions = isRecord(data.definitions) ? data.definitions : {};
  const sectionOrder = Array.isArray(data.sectionOrder) ? (data.sectionOrder as string[]) : [];

  // Check 1: definitions declared but not in sectionOrder (orphaned)
  const referencedKeys = new Set<string>(sectionOrder);
  // Also collect element keys referenced within sections
  for (const def of Object.values(definitions)) {
    if (!isRecord(def)) continue;
    if (Array.isArray(def.elementOrder)) {
      for (const k of def.elementOrder as string[]) referencedKeys.add(k);
    }
    if (isRecord(def.definitions)) {
      for (const k of Object.keys(def.definitions)) referencedKeys.add(k);
    }
  }

  for (const key of Object.keys(definitions)) {
    if (!referencedKeys.has(key)) {
      issues.push({
        severity: "warning",
        code: "orphaned-definition",
        message: `Definition "${key}" is not referenced in sectionOrder or any elementOrder.`,
        path: `definitions.${key}`,
      });
    }
  }

  // Check 2: elements in a section but not in elementOrder
  for (const [secKey, sec] of Object.entries(definitions)) {
    if (!isRecord(sec)) continue;
    const sectType = typeof sec.type === "string" ? sec.type : "";
    const isSectionBlock = [
      "contentBlock",
      "sectionColumn",
      "scrollContainer",
      "revealSection",
      "divider",
      "formBlock",
      "sectionTrigger",
    ].includes(sectType);
    if (!isSectionBlock) continue;

    const elementOrder = Array.isArray(sec.elementOrder) ? (sec.elementOrder as string[]) : [];
    const innerDefs = isRecord(sec.definitions) ? sec.definitions : {};
    for (const elemKey of Object.keys(innerDefs)) {
      if (!elementOrder.includes(elemKey)) {
        issues.push({
          severity: "warning",
          code: "element-not-in-order",
          message: `Element "${elemKey}" in section "${secKey}" is not listed in elementOrder.`,
          path: `definitions.${secKey}.definitions.${elemKey}`,
        });
      }
    }
  }

  // Check 3: button/trigger actions pointing to non-existent routes
  const hrefs: string[] = [];
  collectInternalHrefs(data, hrefs);
  for (const href of hrefs) {
    const normalized = href.replace(/\/$/, "") || "/";
    if (!knownRoutes.has(normalized)) {
      issues.push({
        severity: "warning",
        code: "broken-internal-link",
        message: `Internal link "${href}" does not match any known page route.`,
      });
    }
  }

  // Check 4: overlays always disabled
  if (Array.isArray(data.disableOverlays)) {
    for (const id of data.disableOverlays as string[]) {
      issues.push({
        severity: "warning",
        code: "overlay-disabled",
        message: `Overlay "${id}" is permanently disabled on this page.`,
      });
    }
  }

  // Check 5: sections always invisible (filterConfig present but definition has no matching projectGroup)
  if (isRecord(data.filterConfig) && isRecord(data.projectGroups)) {
    const projectGroups = data.projectGroups as Record<string, { elements?: string[] }>;
    const allGroupedElements = new Set<string>();
    for (const group of Object.values(projectGroups)) {
      if (Array.isArray(group.elements)) {
        for (const el of group.elements) allGroupedElements.add(el as string);
      }
    }
    // Check top-level elements in any section that aren't in any projectGroup
    for (const [secKey, sec] of Object.entries(definitions)) {
      if (!isRecord(sec)) continue;
      const elementOrder = Array.isArray(sec.elementOrder) ? (sec.elementOrder as string[]) : [];
      for (const elemKey of elementOrder) {
        if (!allGroupedElements.has(elemKey)) {
          issues.push({
            severity: "warning",
            code: "element-not-in-project-group",
            message: `Element "${elemKey}" in section "${secKey}" is not in any projectGroup — it may be permanently hidden when filters are active.`,
            path: `definitions.${secKey}`,
          });
        }
      }
    }
  }

  // Check 6: validate each loaded section file referenced by sectionOrder.
  const pageDir = path.dirname(pageFile);
  for (const key of sectionOrder) {
    if (typeof key !== "string") continue;
    const sectionPath = path.join(pageDir, `${key}.json`);
    const read = readJsonFile(sectionPath);
    if (!read.ok) {
      issues.push({
        severity: "error",
        code: "section-load-failed",
        message: "error" in read ? read.error : "Failed to read section file",
        path: `definitions.${key}`,
      });
      continue;
    }
    const validated = validateSectionValue(read.value);
    for (const diagnostic of validated.diagnostics) {
      issues.push({
        severity: diagnostic.severity,
        code: diagnostic.code,
        message: diagnostic.message,
        path: `definitions.${key}${diagnostic.path === "$" ? "" : diagnostic.path.slice(1)}`,
      });
    }
  }

  return issues;
}

export async function runAudit(args: string[], io: CommandIo): Promise<number> {
  const { route, all, asJson, help } = parseAuditArgs(args);

  if (help) {
    io.printText("Usage: pb-cli audit <route|--all> [--json]");
    io.printText("");
    io.printText(
      "Soft audit: orphaned definitions, broken internal links, invisible sections, etc."
    );
    return 0;
  }

  if (!route && !all) {
    io.printErrorText("Error: provide a route or --all.");
    io.printText("Usage: pb-cli audit <route|--all> [--json]");
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "audit", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const allPages = walkPages(pagesDir);
  const knownRoutes = new Set(allPages.map((p) => p.route.replace(/\/$/, "") || "/"));

  type PageResult = { route: string; file: string; issues: AuditIssue[] };
  const results: PageResult[] = [];

  if (all) {
    for (const { route: r, file } of allPages) {
      const read = readPageJson(file);
      if (!read.ok) continue;
      const issues = auditPage(read.data, knownRoutes, file);
      results.push({ route: r, file, issues });
    }
  } else {
    const file = findPageFile(pagesDir, route!);
    if (!file) {
      const msg = `Page not found: ${route}`;
      if (asJson) io.printErrorJson({ command: "audit", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }
    const read = readPageJson(file);
    if (!read.ok) {
      if (asJson) io.printErrorJson({ command: "audit", status: "error", message: read.error });
      else io.printErrorText(`Error: ${read.error}`);
      return 1;
    }
    results.push({ route: route!, file, issues: auditPage(read.data, knownRoutes, file) });
  }

  const totalIssues = results.reduce((n, r) => n + r.issues.length, 0);
  const hasErrors = results.some((r) => r.issues.some((i) => i.severity === "error"));

  if (asJson) {
    const payload = {
      command: "audit",
      totalIssues,
      pages: Object.fromEntries(
        results.map((r) => [
          r.route,
          { file: r.file, issueCount: r.issues.length, issues: r.issues },
        ])
      ),
    };
    if (hasErrors || totalIssues > 0) io.printErrorJson(payload);
    else io.printJson(payload);
  } else {
    io.printText(`Audit: ${totalIssues} issue(s) across ${results.length} page(s)`);
    for (const { route: r, issues } of results) {
      if (issues.length === 0) continue;
      io.printText(`  ${r}`);
      for (const issue of issues) {
        const sev = issue.severity === "error" ? "ERROR" : "WARN";
        const loc = issue.path ? ` @ ${issue.path}` : "";
        io.printText(`    [${sev}] ${issue.code}${loc}: ${issue.message}`);
      }
    }
    if (totalIssues === 0) io.printText("  (no issues found)");
  }

  return totalIssues > 0 ? 1 : 0;
}
