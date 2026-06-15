import { findPagesDir, findPageFile, walkPages, readPageJson, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type GpuFinding = {
  severity: "error" | "warning";
  rule: string;
  message: string;
  sections?: string[];
};
type PageGpuResult = { route: string; file: string; findings: GpuFinding[] };

function parseArgs(args: string[]): {
  route?: string;
  all: boolean;
  asJson: boolean;
  help: boolean;
} {
  const asJson = args.includes("--json");
  const all = args.includes("--all");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();
  for (const flag of ["--json", "--all", "--help", "-h"]) {
    const i = args.indexOf(flag);
    if (i !== -1) consumed.add(i);
  }
  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], all, asJson, help };
}

function lintPageGpu(data: Record<string, unknown>): GpuFinding[] {
  const defs = isRecord(data.definitions) ? data.definitions : {};
  const sectionOrder = Array.isArray(data.sectionOrder) ? (data.sectionOrder as string[]) : [];
  const bgKey = typeof data.bgKey === "string" ? data.bgKey : null;
  if (!bgKey) return [];

  const bg = defs[bgKey];
  if (!isRecord(bg)) return [];
  const bgType = typeof bg.type === "string" ? bg.type : "";
  const layers = bgType === "backgroundVariable" && Array.isArray(bg.layers) ? bg.layers : [];

  let animatedLayerCount = 0;
  let blendModeLayerCount = 0;
  for (const layer of layers) {
    if (!isRecord(layer)) continue;
    const l = layer as Record<string, unknown>;
    if (Array.isArray(l.motion) && l.motion.length > 0) animatedLayerCount++;
    if (typeof l.blendMode === "string") blendModeLayerCount++;
  }

  const backdropSections: string[] = [];
  const glassSections: string[] = [];
  for (const key of sectionOrder) {
    const sec = defs[key];
    if (!isRecord(sec)) continue;
    if (typeof sec.backdropFilter === "string" && sec.backdropFilter.trim())
      backdropSections.push(key);
    const effects = Array.isArray(sec.effects) ? sec.effects : [];
    if (effects.some((e) => isRecord(e) && (e as Record<string, unknown>).type === "glass"))
      glassSections.push(key);
  }

  const findings: GpuFinding[] = [];

  if (bgType === "backgroundVideo" && backdropSections.length > 0)
    findings.push({
      severity: "error",
      rule: "COMPOSITING_EXPLOSION",
      message:
        "backgroundVideo + backdropFilter forces multi-layer GPU compositing. Mobile will struggle.",
      sections: backdropSections,
    });

  if (bgType === "backgroundVideo" && glassSections.length > 0)
    findings.push({
      severity: "error",
      rule: "GLASS_OVER_VIDEO",
      message: "backgroundVideo + glass creates a compositing stack that overwhelms mobile GPUs.",
      sections: glassSections,
    });

  if (bgType === "backgroundVariable" && animatedLayerCount > 0 && backdropSections.length > 0)
    findings.push({
      severity: "warning",
      rule: "ANIMATED_BG_PLUS_BACKDROP",
      message: `backgroundVariable with ${animatedLayerCount} animated layer(s) + backdropFilter = per-frame GPU repaint.`,
      sections: backdropSections,
    });

  if (bgType === "backgroundVariable" && animatedLayerCount > 0 && glassSections.length > 0)
    findings.push({
      severity: "warning",
      rule: "ANIMATED_BG_PLUS_GLASS",
      message: `backgroundVariable with ${animatedLayerCount} animated layer(s) + glass = per-frame blur compositing.`,
      sections: glassSections,
    });

  if (
    bgType === "backgroundVariable" &&
    blendModeLayerCount >= 2 &&
    (backdropSections.length > 0 || glassSections.length > 0)
  ) {
    const affected = [...new Set([...backdropSections, ...glassSections])];
    findings.push({
      severity: "warning",
      rule: "BLEND_MODE_STACK",
      message: `${blendModeLayerCount} blend-mode layers + filter/glass = sub-pixel compositing layer explosion.`,
      sections: affected,
    });
  }

  if (bgType === "backgroundVariable" && animatedLayerCount >= 4)
    findings.push({
      severity: "warning",
      rule: "DENSE_ANIMATED_LAYERS",
      message: `${animatedLayerCount} animated layers creates excessive compositor thread pressure.`,
    });

  return findings;
}

export async function runLintGpu(args: string[], io: CommandIo): Promise<number> {
  const { route, all, asJson, help } = parseArgs(args);
  if (help) {
    io.printText("Usage: pb-cli lint-gpu <route|--all> [--json]");
    io.printText(
      "Flags dangerous GPU stack combinations (video+glass, animated bg+backdrop, etc.)"
    );
    return 0;
  }
  if (!route && !all) {
    io.printErrorText("Error: provide a route or --all.");
    return 2;
  }
  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found.";
    if (asJson) io.printErrorJson({ command: "lint-gpu", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const results: PageGpuResult[] = [];
  if (all) {
    for (const { route: r, file } of walkPages(pagesDir)) {
      const read = readPageJson(file);
      if (!read.ok) continue;
      results.push({ route: r, file, findings: lintPageGpu(read.data) });
    }
  } else {
    const file = findPageFile(pagesDir, route!);
    if (!file) {
      if (asJson)
        io.printErrorJson({
          command: "lint-gpu",
          status: "error",
          message: `Page not found: ${route}`,
        });
      else io.printErrorText(`Error: Page not found: ${route}`);
      return 1;
    }
    const read = readPageJson(file);
    if (!read.ok) {
      if (asJson) io.printErrorJson({ command: "lint-gpu", status: "error", message: read.error });
      else io.printErrorText(`Error: ${read.error}`);
      return 1;
    }
    results.push({ route: route!, file, findings: lintPageGpu(read.data) });
  }

  const total = results.reduce((n, r) => n + r.findings.length, 0);
  const hasErrors = results.some((r) => r.findings.some((f) => f.severity === "error"));
  if (asJson) {
    const payload = {
      command: "lint-gpu",
      totalFindings: total,
      pages: Object.fromEntries(
        results.map((r) => [
          r.route,
          { file: r.file, findingCount: r.findings.length, findings: r.findings },
        ])
      ),
    };
    if (hasErrors || total > 0) io.printErrorJson(payload);
    else io.printJson(payload);
  } else {
    io.printText(`GPU lint: ${total} finding(s) across ${results.length} page(s)`);
    for (const { route: r, findings } of results) {
      if (findings.length === 0) continue;
      io.printText(`  ${r}`);
      for (const f of findings) {
        const secs = f.sections?.length ? ` (${f.sections.join(", ")})` : "";
        io.printText(
          `    [${f.severity === "error" ? "ERROR" : "WARN"}] ${f.rule}${secs}: ${f.message}`
        );
      }
    }
    if (total === 0) io.printText("  (no GPU overdraw patterns found)");
  }
  return total > 0 ? 1 : 0;
}
