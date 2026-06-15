import { findPagesDir, findPageFile, walkPages, readPageJson, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

const OBSERVER_SCALAR_PROPS = ["onVisible", "onProgress", "onViewportProgress"] as const;
const OBSERVER_ARRAY_PROPS = [
  "timerTriggers",
  "cursorTriggers",
  "scrollDirectionTriggers",
  "idleTriggers",
] as const;

type ObserverHit = { prop: string; count: number };
type SectionResult = { key: string; observerCount: number; hits: ObserverHit[] };
type PageResult = {
  route: string;
  file: string;
  totalObservers: number;
  flagged: boolean;
  sections: SectionResult[];
};

function parseArgs(args: string[]): {
  route?: string;
  all: boolean;
  threshold: number;
  asJson: boolean;
  help: boolean;
} {
  const asJson = args.includes("--json");
  const all = args.includes("--all");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();
  let threshold = 5;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--threshold" && args[i + 1]) {
      const n = parseInt(args[i + 1]!, 10);
      if (!isNaN(n)) threshold = n;
      consumed.add(i);
      consumed.add(i + 1);
    } else if (["--json", "--all", "--help", "-h"].includes(arg)) {
      consumed.add(i);
    }
  }
  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], all, threshold, asJson, help };
}

function countSectionObservers(sec: Record<string, unknown>): {
  count: number;
  hits: ObserverHit[];
} {
  const hits: ObserverHit[] = [];
  for (const prop of OBSERVER_SCALAR_PROPS) {
    if (sec[prop] != null) hits.push({ prop, count: 1 });
  }
  for (const prop of OBSERVER_ARRAY_PROPS) {
    const arr = sec[prop];
    if (Array.isArray(arr) && arr.length > 0) hits.push({ prop, count: arr.length });
  }
  return { count: hits.reduce((n, h) => n + h.count, 0), hits };
}

function scorePage(
  data: Record<string, unknown>,
  threshold: number
): Omit<PageResult, "route" | "file"> {
  const defs = isRecord(data.definitions) ? data.definitions : {};
  const sectionOrder = Array.isArray(data.sectionOrder) ? (data.sectionOrder as string[]) : [];
  const sections: SectionResult[] = [];
  let totalObservers = 0;
  for (const key of sectionOrder) {
    const sec = defs[key];
    if (!isRecord(sec)) continue;
    const { count, hits } = countSectionObservers(sec);
    totalObservers += count;
    if (count > 0) sections.push({ key, observerCount: count, hits });
  }
  return { totalObservers, flagged: totalObservers >= threshold, sections };
}

export async function runLintObservers(args: string[], io: CommandIo): Promise<number> {
  const { route, all, threshold, asJson, help } = parseArgs(args);
  if (help) {
    io.printText("Usage: pb-cli lint-observers <route|--all> [--threshold N] [--json]");
    io.printText("Counts observer-producing props per section per page.");
    return 0;
  }
  if (!route && !all) {
    io.printErrorText("Error: provide a route or --all.");
    return 2;
  }
  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "lint-observers", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const results: PageResult[] = [];
  if (all) {
    for (const { route: r, file } of walkPages(pagesDir)) {
      const read = readPageJson(file);
      if (!read.ok) continue;
      results.push({ route: r, file, ...scorePage(read.data, threshold) });
    }
  } else {
    const file = findPageFile(pagesDir, route!);
    if (!file) {
      const msg = `Page not found: ${route}`;
      if (asJson) io.printErrorJson({ command: "lint-observers", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }
    const read = readPageJson(file);
    if (!read.ok) {
      if (asJson)
        io.printErrorJson({ command: "lint-observers", status: "error", message: read.error });
      else io.printErrorText(`Error: ${read.error}`);
      return 1;
    }
    results.push({ route: route!, file, ...scorePage(read.data, threshold) });
  }

  const flagged = results.filter((r) => r.flagged);
  if (asJson) {
    io.printJson({
      command: "lint-observers",
      threshold,
      flaggedCount: flagged.length,
      pages: Object.fromEntries(
        results.map((r) => [
          r.route,
          {
            file: r.file,
            totalObservers: r.totalObservers,
            flagged: r.flagged,
            sections: r.sections,
          },
        ])
      ),
    });
  } else {
    io.printText(
      `Observer budget: ${flagged.length} flagged page(s) (threshold: ${threshold}) across ${results.length} page(s)`
    );
    for (const r of results) {
      if (r.sections.length === 0) continue;
      io.printText(
        `  ${r.route} — ${r.totalObservers} observer(s)${r.flagged ? " [OVER BUDGET]" : ""}`
      );
      for (const sec of r.sections) {
        io.printText(`    [${sec.key}] ${sec.observerCount}`);
        for (const h of sec.hits) io.printText(`      ${h.prop}: ${h.count}`);
      }
    }
    if (results.every((r) => r.sections.length === 0)) io.printText("  (none found)");
  }
  return flagged.length > 0 ? 1 : 0;
}
