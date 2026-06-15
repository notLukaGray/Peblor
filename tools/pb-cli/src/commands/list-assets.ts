import fs from "node:fs";
import path from "node:path";
import {
  findPagesDir,
  findPageFile,
  walkAllPages,
  isRecord,
  findPresetsDir,
} from "../lib/pages.js";
import type { CommandIo } from "./types.js";

const ASSET_KEYS = new Set(["url", "src", "poster", "image", "video"]);
const SKIP_PREFIXES = ["http://", "https://", "/api/", "data:"];

type AssetRef = {
  route: string;
  path: string;
  key: string;
  value: string;
  type: "image" | "video" | "vector" | "other";
};

type ListAssetsArgs = {
  route?: string;
  filterType?: string;
  unresolvedOnly: boolean;
  asJson: boolean;
  help: boolean;
};

function parseListAssetsArgs(args: string[]): ListAssetsArgs {
  const asJson = args.includes("--json");
  const unresolvedOnly = args.includes("--unresolved");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const filterType = flag("--type");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--unresolved", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], filterType, unresolvedOnly, asJson, help };
}

function inferType(value: string): AssetRef["type"] {
  const lower = value.toLowerCase();
  if (lower.match(/\.(jpe?g|png|gif|webp|avif|heic|tiff?)(\?|$)/)) return "image";
  if (lower.match(/\.(mp4|webm|ogg|mov|m3u8|mpd)(\?|$)/)) return "video";
  if (lower.match(/\.(svg|lottie)(\?|$)/)) return "vector";
  return "other";
}

function isSkipped(value: string): boolean {
  return SKIP_PREFIXES.some((p) => value.startsWith(p));
}

function collectAssets(node: unknown, segments: string[], refs: AssetRef[], route: string): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectAssets(item, [...segments, String(i)], refs, route));
    return;
  }
  if (!isRecord(node)) return;
  for (const [key, value] of Object.entries(node)) {
    if (ASSET_KEYS.has(key) && typeof value === "string" && value && !isSkipped(value)) {
      refs.push({
        route,
        path: [...segments, key].join("."),
        key,
        value,
        type: inferType(value),
      });
    }
    collectAssets(value, [...segments, key], refs, route);
  }
}

export async function runListAssets(args: string[], io: CommandIo): Promise<number> {
  const {
    route,
    filterType,
    unresolvedOnly: _unresolvedOnly,
    asJson,
    help,
  } = parseListAssetsArgs(args);

  if (help) {
    io.printText(
      "Usage: pb-cli list-assets [route] [--type image|video|vector] [--unresolved] [--json]"
    );
    return 0;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "list-assets", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  let pages: Array<{ route: string; file: string; data: Record<string, unknown> }>;

  if (route) {
    const file = findPageFile(pagesDir, route);
    if (!file) {
      const msg = `Page not found: ${route}`;
      if (asJson) io.printErrorJson({ command: "list-assets", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }
    try {
      const raw = fs.readFileSync(file, "utf8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      pages = [{ route, file, data }];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (asJson) io.printErrorJson({ command: "list-assets", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }
  } else {
    pages = walkAllPages(pagesDir);
  }

  const refs: AssetRef[] = [];
  const presetsDir = findPresetsDir();
  const assetPresetCache = new Map<string, AssetRef[]>();

  for (const { route: r, data } of pages) {
    collectAssets(data, [], refs, r);

    // Also collect assets from preset files the page imports.
    const presets = Array.isArray(data.presets)
      ? (data.presets as unknown[]).filter(
          (p): p is string => typeof p === "string" && p.endsWith(".json")
        )
      : [];
    if (presetsDir) {
      for (const presetFilename of presets) {
        let presetRefs = assetPresetCache.get(presetFilename);
        if (presetRefs === undefined) {
          const presetPath = path.join(presetsDir, presetFilename);
          try {
            const presetData = JSON.parse(fs.readFileSync(presetPath, "utf8"));
            presetRefs = [];
            collectAssets(presetData, [`$(preset:${presetFilename})`], presetRefs, r);
          } catch (err) {
            console.warn("[pb-cli] Failed to parse preset for asset collection", presetPath, err);
            presetRefs = [];
          }
          assetPresetCache.set(presetFilename, presetRefs);
        }
        refs.push(...presetRefs);
      }
    }
  }

  let filtered = refs;
  if (filterType) {
    filtered = filtered.filter((ref) => ref.type === filterType);
  }

  if (asJson) {
    const byPage: Record<string, AssetRef[]> = {};
    for (const ref of filtered) {
      byPage[ref.route] ??= [];
      byPage[ref.route]!.push(ref);
    }
    io.printJson({
      command: "list-assets",
      totalRefs: filtered.length,
      ...(filterType ? { filterType } : {}),
      pages: byPage,
    });
  } else {
    io.printText(
      `Assets: ${filtered.length} ref(s) across ${new Set(filtered.map((r) => r.route)).size} page(s)`
    );
    const byPage = new Map<string, AssetRef[]>();
    for (const ref of filtered) {
      const bucket = byPage.get(ref.route) ?? [];
      bucket.push(ref);
      byPage.set(ref.route, bucket);
    }
    for (const [r, pageRefs] of byPage) {
      io.printText(`  ${r}`);
      for (const ref of pageRefs) {
        io.printText(`    [${ref.type}] ${ref.path}: ${ref.value}`);
      }
    }
    if (filtered.length === 0) io.printText("  (no asset refs found)");
  }

  return 0;
}
