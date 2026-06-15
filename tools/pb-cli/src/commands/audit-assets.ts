import fs from "node:fs";
import path from "node:path";
import {
  findPagesDir,
  findPageFile,
  walkAllPages,
  isRecord,
  findPresetsDir,
} from "../lib/pages.js";
import { getSignedCdnUrl } from "@pb/core/lib/cdn-asset-server";
import type { CommandIo } from "./types.js";

const ASSET_KEYS = new Set(["url", "src", "poster", "image", "video"]);
const SKIP_PREFIXES = ["http://", "https://", "/api/", "data:"];

type AuditAssetsArgs = {
  route?: string;
  asJson: boolean;
  help: boolean;
};

type AssetStatus = {
  path: string;
  value: string;
  url: string | null;
  error: string | null;
};

function parseArgs(args: string[]): AuditAssetsArgs {
  const asJson = args.includes("--json");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }
  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], asJson, help };
}

function collectAssetValues(
  node: unknown,
  segments: string[],
  out: Array<{ path: string; value: string }>
): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectAssetValues(item, [...segments, String(i)], out));
    return;
  }
  if (!isRecord(node)) return;
  for (const [key, value] of Object.entries(node)) {
    if (
      ASSET_KEYS.has(key) &&
      typeof value === "string" &&
      value &&
      !SKIP_PREFIXES.some((p) => value.startsWith(p))
    ) {
      out.push({ path: [...segments, key].join("."), value });
    }
    collectAssetValues(value, [...segments, key], out);
  }
}

export async function runAuditAssets(args: string[], io: CommandIo): Promise<number> {
  const { route, asJson, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli audit-assets [route] [--json]");
    io.printText("\nFor a page (or all pages), verifies each asset ref resolves to a CDN URL.");
    return 0;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "audit-assets", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  let pages: Array<{ route: string; file: string; data: Record<string, unknown> }>;

  if (route) {
    const file = findPageFile(pagesDir, route);
    if (!file) {
      const msg = `Page not found: ${route}`;
      if (asJson) io.printErrorJson({ command: "audit-assets", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      pages = [{ route, file, data }];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (asJson) io.printErrorJson({ command: "audit-assets", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }
  } else {
    pages = walkAllPages(pagesDir);
  }

  const results: Record<string, AssetStatus[]> = {};
  let totalBroken = 0;
  const presetsDir = findPresetsDir();
  const assetPresetCache = new Map<string, Array<{ path: string; value: string }>>();

  for (const { route: r, data } of pages) {
    const assets: Array<{ path: string; value: string }> = [];
    collectAssetValues(data, [], assets);

    // Also collect asset values from preset files the page imports.
    const presets = Array.isArray(data.presets)
      ? (data.presets as unknown[]).filter(
          (p): p is string => typeof p === "string" && p.endsWith(".json")
        )
      : [];
    if (presetsDir) {
      for (const presetFilename of presets) {
        let presetAssets = assetPresetCache.get(presetFilename);
        if (presetAssets === undefined) {
          const presetPath = path.join(presetsDir, presetFilename);
          try {
            const presetData = JSON.parse(fs.readFileSync(presetPath, "utf8"));
            presetAssets = [];
            collectAssetValues(presetData, [`$(preset:${presetFilename})`], presetAssets);
          } catch (err) {
            console.warn("[pb-cli] Failed to parse preset for asset audit", presetPath, err);
            presetAssets = [];
          }
          assetPresetCache.set(presetFilename, presetAssets);
        }
        assets.push(...presetAssets);
      }
    }

    if (assets.length === 0) continue;

    const statuses: AssetStatus[] = [];
    for (const { path: p, value } of assets) {
      try {
        const url = getSignedCdnUrl(value);
        statuses.push({ path: p, value, url, error: null });
      } catch (e) {
        totalBroken++;
        statuses.push({
          path: p,
          value,
          url: null,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    results[r] = statuses;
  }

  if (asJson) {
    const payload = { command: "audit-assets", totalBroken, results };
    if (totalBroken > 0) io.printErrorJson(payload);
    else io.printJson(payload);
  } else {
    io.printText(
      `audit-assets: ${totalBroken} broken ref(s) across ${Object.keys(results).length} page(s)`
    );
    for (const [r, statuses] of Object.entries(results)) {
      const broken = statuses.filter((s) => s.error);
      if (broken.length === 0) continue;
      io.printText(`  ${r}`);
      for (const s of broken) {
        io.printText(`    BROKEN ${s.path}: ${s.value} — ${s.error}`);
      }
    }
    if (totalBroken === 0) io.printText("  (all asset refs resolve)");
  }

  return totalBroken > 0 ? 1 : 0;
}
