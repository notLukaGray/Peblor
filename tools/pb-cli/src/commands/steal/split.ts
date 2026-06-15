import fs from "fs";
import path from "path";
import { findRepoRoot } from "./paths.js";
import type { CommandIo } from "../types.js";

type StealSplitArgs = {
  route?: string;
  dryRun: boolean;
  asJson: boolean;
  help: boolean;
};

function parseArgs(args: string[]): StealSplitArgs {
  const asJson = args.includes("--json");
  const dryRun = args.includes("--dry-run");
  const help = args.includes("--help") || args.includes("-h");
  const positional = args.filter((a) => !["--json", "--dry-run", "--help", "-h"].includes(a));
  return { route: positional[0], dryRun, asJson, help };
}

export async function runStealSplit(args: string[], io: CommandIo): Promise<number> {
  const { route, dryRun, asJson, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli steal-split <route> [--dry-run] [--json]");
    io.printText("");
    io.printText("Splits a stolen page's inline index.json into sidecar section files.");
    io.printText("Each section in sectionOrder gets its own <key>.json file.");
    io.printText("index.json is rewritten to contain only metadata and background definitions.");
    return 0;
  }

  if (!route) {
    io.printErrorText("Error: route is required (e.g. /stolen/linear)");
    io.printText("Usage: pb-cli steal-split <route> [--dry-run] [--json]");
    return 2;
  }

  const repoRoot = findRepoRoot();
  const pagesDir = path.join(repoRoot, "content/pages");

  const routeSegments = route.replace(/^\//, "").split("/");
  const pageDir = path.join(pagesDir, ...routeSegments);
  const indexPath = path.join(pageDir, "index.json");

  if (!fs.existsSync(indexPath)) {
    io.printErrorText(`Error: ${indexPath} not found`);
    return 1;
  }

  let pageJson: Record<string, unknown>;
  try {
    pageJson = JSON.parse(fs.readFileSync(indexPath, "utf8")) as Record<string, unknown>;
  } catch (e) {
    io.printErrorText(`Error: failed to parse ${indexPath}: ${String(e)}`);
    return 1;
  }

  const sectionOrder = pageJson["sectionOrder"];
  if (!Array.isArray(sectionOrder)) {
    io.printErrorText("Error: index.json has no sectionOrder array");
    return 1;
  }

  const definitions = pageJson["definitions"] as Record<string, unknown> | undefined;
  if (!definitions) {
    io.printErrorText("Error: index.json has no definitions object");
    return 1;
  }

  const sectionKeys = new Set<string>(sectionOrder as string[]);
  const sidecarResults: Array<{ key: string; file: string; skipped?: string }> = [];

  for (const key of sectionOrder as string[]) {
    if (typeof key !== "string") continue;
    const sectionDef = definitions[key];
    if (!sectionDef) {
      sidecarResults.push({ key, file: `${key}.json`, skipped: "not in definitions" });
      continue;
    }

    const sidecarPath = path.join(pageDir, `${key}.json`);
    const sidecarContent = JSON.stringify(sectionDef, null, 2) + "\n";

    if (!dryRun) {
      fs.writeFileSync(sidecarPath, sidecarContent, "utf8");
    }
    sidecarResults.push({ key, file: `${key}.json` });
  }

  // Rewrite index.json keeping only non-section definitions (backgrounds, etc.)
  const backgroundDefs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(definitions)) {
    if (!sectionKeys.has(k)) {
      backgroundDefs[k] = v;
    }
  }

  const minimalIndex: Record<string, unknown> = {};
  for (const field of ["title", "description", "sectionOrder", "bgKey", "presets", "scroll"]) {
    if (pageJson[field] !== undefined) minimalIndex[field] = pageJson[field];
  }
  if (Object.keys(backgroundDefs).length > 0) {
    minimalIndex["definitions"] = backgroundDefs;
  }

  const minimalContent = JSON.stringify(minimalIndex, null, 2) + "\n";

  if (!dryRun) {
    fs.writeFileSync(indexPath, minimalContent, "utf8");
  }

  const result = {
    status: "ok" as const,
    route,
    dryRun,
    sidecarsWritten: sidecarResults.filter((r) => !r.skipped).length,
    sidecars: sidecarResults,
    indexRewritten: true,
  };

  if (asJson) {
    io.printJson(result);
  } else {
    io.printText(`steal-split: ${route}`);
    io.printText(`  Sidecars: ${result.sidecarsWritten} written`);
    for (const r of sidecarResults) {
      io.printText(
        `  ${r.skipped ? "  skip" : "    ok"} ${r.file}${r.skipped ? ` (${r.skipped})` : ""}`
      );
    }
    io.printText(`  index.json rewritten (${sectionOrder.length} sections stripped)`);
    if (dryRun) io.printText("  (dry-run — nothing written)");
  }

  return 0;
}
