import { findPagesDir, findPageFile, walkPages, readPageJson, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type CostHit = { source: string; reason: string; cost: number };
type PageScore = {
  route: string;
  file: string;
  totalCost: number;
  flagged: boolean;
  hits: CostHit[];
};

function parseArgs(args: string[]): {
  route?: string;
  all: boolean;
  firstN: number;
  threshold: number;
  asJson: boolean;
  help: boolean;
} {
  const asJson = args.includes("--json");
  const all = args.includes("--all");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();
  let firstN = 3;
  let threshold = 8;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if ((arg === "--first" || arg === "--threshold") && args[i + 1]) {
      const n = parseInt(args[i + 1]!, 10);
      if (!isNaN(n)) {
        if (arg === "--first") firstN = n;
        else threshold = n;
      }
      consumed.add(i);
      consumed.add(i + 1);
    } else if (["--json", "--all", "--help", "-h"].includes(arg)) {
      consumed.add(i);
    }
  }
  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], all, firstN, threshold, asJson, help };
}

function scoreBg(bg: Record<string, unknown>, bgKey: string): CostHit[] {
  const hits: CostHit[] = [];
  const t = typeof bg.type === "string" ? bg.type : "";
  const src = `bg:${bgKey}`;
  if (t === "backgroundVideo") hits.push({ source: src, reason: "backgroundVideo", cost: 3 });
  if (t === "backgroundVariable") {
    const layers = Array.isArray(bg.layers) ? bg.layers : [];
    if (
      layers.some(
        (l) =>
          isRecord(l) &&
          Array.isArray((l as Record<string, unknown>).motion) &&
          ((l as Record<string, unknown>).motion as unknown[]).length > 0
      )
    )
      hits.push({ source: src, reason: "backgroundVariable animated layers", cost: 2 });
    if (
      layers.some(
        (l) => isRecord(l) && typeof (l as Record<string, unknown>).blendMode === "string"
      )
    )
      hits.push({ source: src, reason: "backgroundVariable blendMode layer", cost: 1 });
  }
  return hits;
}

function scoreSectionShell(sec: Record<string, unknown>, key: string): CostHit[] {
  const hits: CostHit[] = [];
  const src = `section:${key}`;
  const effects = Array.isArray(sec.effects) ? sec.effects : [];
  if (effects.some((e) => isRecord(e) && (e as Record<string, unknown>).type === "glass"))
    hits.push({ source: src, reason: "glass effect", cost: 2 });
  if (typeof sec.backdropFilter === "string" && sec.backdropFilter.trim())
    hits.push({ source: src, reason: "backdropFilter", cost: 1 });
  return hits;
}

function scoreElement(el: Record<string, unknown>, elemKey: string, secKey: string): CostHit[] {
  const hits: CostHit[] = [];
  const t = typeof el.type === "string" ? el.type : "";
  const src = `element:${secKey}/${elemKey}`;
  if (t === "elementModel3D") hits.push({ source: src, reason: "elementModel3D", cost: 3 });
  if (t === "elementRive") hits.push({ source: src, reason: "elementRive", cost: 2 });
  if (t === "elementVideo" && el.autoplay === true)
    hits.push({ source: src, reason: "elementVideo autoplay", cost: 2 });
  const mt = el.motionTiming;
  if (isRecord(mt) && (mt as Record<string, unknown>).entrancePreset != null)
    hits.push({ source: src, reason: "entrance animation", cost: 1 });
  return hits;
}

function scorePage(
  data: Record<string, unknown>,
  firstN: number,
  threshold: number
): Omit<PageScore, "route" | "file"> {
  const defs = isRecord(data.definitions) ? data.definitions : {};
  const sectionOrder = Array.isArray(data.sectionOrder) ? (data.sectionOrder as string[]) : [];
  const bgKey = typeof data.bgKey === "string" ? data.bgKey : null;
  const hits: CostHit[] = [];

  if (bgKey) {
    const bg = defs[bgKey];
    if (isRecord(bg)) hits.push(...scoreBg(bg, bgKey));
  }

  for (const secKey of sectionOrder.slice(0, firstN)) {
    const sec = defs[secKey];
    if (!isRecord(sec)) continue;
    hits.push(...scoreSectionShell(sec, secKey));
    const elemDefs = isRecord(sec.definitions) ? sec.definitions : {};
    const elemOrder = Array.isArray(sec.elementOrder) ? (sec.elementOrder as string[]) : [];
    for (const elemKey of elemOrder) {
      const el = elemDefs[elemKey];
      if (isRecord(el)) hits.push(...scoreElement(el, elemKey, secKey));
    }
  }

  const totalCost = hits.reduce((n, h) => n + h.cost, 0);
  return { totalCost, flagged: totalCost >= threshold, hits };
}

export async function runScoreHero(args: string[], io: CommandIo): Promise<number> {
  const { route, all, firstN, threshold, asJson, help } = parseArgs(args);
  if (help) {
    io.printText("Usage: pb-cli score-hero <route|--all> [--first N] [--threshold N] [--json]");
    io.printText("Scores first-viewport cost (bg, glass, 3D, Rive, entrance motion).");
    return 0;
  }
  if (!route && !all) {
    io.printErrorText("Error: provide a route or --all.");
    return 2;
  }
  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found.";
    if (asJson) io.printErrorJson({ command: "score-hero", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const results: PageScore[] = [];
  if (all) {
    for (const { route: r, file } of walkPages(pagesDir)) {
      const read = readPageJson(file);
      if (!read.ok) continue;
      results.push({ route: r, file, ...scorePage(read.data, firstN, threshold) });
    }
  } else {
    const file = findPageFile(pagesDir, route!);
    if (!file) {
      const msg = `Page not found: ${route}`;
      if (asJson) io.printErrorJson({ command: "score-hero", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }
    const read = readPageJson(file);
    if (!read.ok) {
      if (asJson)
        io.printErrorJson({ command: "score-hero", status: "error", message: read.error });
      else io.printErrorText(`Error: ${read.error}`);
      return 1;
    }
    results.push({ route: route!, file, ...scorePage(read.data, firstN, threshold) });
  }

  const flagged = results.filter((r) => r.flagged);
  if (asJson) {
    io.printJson({
      command: "score-hero",
      firstN,
      threshold,
      flaggedCount: flagged.length,
      pages: Object.fromEntries(
        results.map((r) => [
          r.route,
          { file: r.file, totalCost: r.totalCost, flagged: r.flagged, hits: r.hits },
        ])
      ),
    });
  } else {
    io.printText(
      `Hero score: ${flagged.length} page(s) over budget (threshold: ${threshold}, first ${firstN} sections)`
    );
    for (const r of [...results].sort((a, b) => b.totalCost - a.totalCost)) {
      if (r.hits.length === 0) continue;
      io.printText(`  ${r.route} — score: ${r.totalCost}${r.flagged ? " [OVER BUDGET]" : ""}`);
      for (const h of r.hits) io.printText(`    [+${h.cost}] ${h.source}: ${h.reason}`);
    }
    if (results.every((r) => r.hits.length === 0)) io.printText("  (no expensive patterns found)");
  }
  return flagged.length > 0 ? 1 : 0;
}
