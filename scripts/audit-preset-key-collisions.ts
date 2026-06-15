#!/usr/bin/env npx tsx
/**
 * audit-preset-key-collisions.ts
 *
 * Detects preset key collisions in the Peblor content system.
 * Preset keys must be globally unique per page load — the runtime merges
 * global presets and page-level presets into one flat namespace, so any key
 * defined in more than one loaded source (for a given page) is non-deterministic.
 *
 * Exit code 1 if any collision is found (hard CI gate).
 */

import fs from "node:fs";
import path from "node:path";
import { discoverAllPages } from "@pb/core/load";

const PRESETS_DIR = path.resolve(process.cwd(), "content/presets");
const GLOBAL_PRESETS_PATH = path.resolve(process.cwd(), "content/data/presets.json");

type KeyEntry = { key: string; source: string };

// ---------------------------------------------------------------------------
// Helpers — mirror the logic in packages/core/src/internal/load/peblor-load-presets.ts
// ---------------------------------------------------------------------------

function isSingleBlock(data: unknown): boolean {
  return (
    data != null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    ("type" in (data as object) || "preset" in (data as object))
  );
}

function extractKeysFromPresetData(data: unknown, filePath: string): KeyEntry[] {
  const entries: KeyEntry[] = [];
  if (isSingleBlock(data)) {
    // Single-block file: the key is the file basename
    const key = path.basename(filePath, ".json");
    entries.push({ key, source: filePath });
  } else if (data != null && typeof data === "object" && !Array.isArray(data)) {
    // Multi-key file: coercePresetMap semantics
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value == null || typeof value !== "object" || Array.isArray(value)) continue;
      const rec = value as Record<string, unknown>;
      if (typeof rec.type !== "string" && typeof rec.preset !== "string") continue;
      entries.push({ key, source: filePath });
    }
  }
  return entries;
}

function loadPresetDirectory(dirPath: string): KeyEntry[] {
  if (!fs.existsSync(dirPath)) return [];
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) return [];
  const entries: KeyEntry[] = [];
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of files) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(dirPath, entry.name);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    entries.push(...extractKeysFromPresetData(data, filePath));
  }
  return entries;
}

function loadPresetRef(ref: string): KeyEntry[] {
  if (!ref) return [];
  // Normalize: strip trailing slash
  const normalized = ref.replace(/\/$/, "");
  const absDir = path.resolve(PRESETS_DIR, normalized);
  if (fs.existsSync(absDir) && fs.statSync(absDir).isDirectory()) {
    return loadPresetDirectory(absDir);
  }
  // Single file with .json extension
  const absFile = ref.endsWith(".json")
    ? path.resolve(PRESETS_DIR, normalized)
    : path.resolve(PRESETS_DIR, `${normalized}.json`);
  if (fs.existsSync(absFile)) {
    const data = JSON.parse(fs.readFileSync(absFile, "utf8")) as unknown;
    return extractKeysFromPresetData(data, absFile);
  }
  return [];
}

function loadGlobalPresetRefs(): string[] {
  if (!fs.existsSync(GLOBAL_PRESETS_PATH)) return [];
  const data = JSON.parse(fs.readFileSync(GLOBAL_PRESETS_PATH, "utf8")) as unknown;
  if (
    data != null &&
    typeof data === "object" &&
    "load" in (data as object) &&
    Array.isArray((data as Record<string, unknown>).load)
  ) {
    return (data as Record<string, unknown[]>).load.filter(
      (x): x is string => typeof x === "string"
    );
  }
  return [];
}

// ---------------------------------------------------------------------------
// Collision detection per page
// ---------------------------------------------------------------------------

type Collision = {
  page: string;
  key: string;
  sources: string[];
};

function detectCollisionsForPage(
  pageSlug: string,
  pagePresetRefs: string[],
  globalRefs: string[]
): Collision[] {
  // Build the full load list as the runtime does: global first, then page-level
  const allRefs = [...globalRefs, ...pagePresetRefs];
  const keyToSources: Map<string, string[]> = new Map();

  for (const ref of allRefs) {
    const entries = loadPresetRef(ref);
    for (const { key, source } of entries) {
      const existing = keyToSources.get(key) ?? [];
      // Only record distinct source paths
      if (!existing.includes(source)) {
        existing.push(source);
        keyToSources.set(key, existing);
      }
    }
  }

  const collisions: Collision[] = [];
  for (const [key, sources] of keyToSources) {
    if (sources.length > 1) {
      collisions.push({ page: pageSlug, key, sources });
    }
  }
  return collisions;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const pages = await discoverAllPages();
  const globalRefs = loadGlobalPresetRefs();

  const allCollisions: Collision[] = [];

  for (const page of pages) {
    const pageSlug = page.slugSegments.join("/") || "(root)";
    const rawIndex = fs.readFileSync(page.contentPath, "utf8");
    const pageData = JSON.parse(rawIndex) as Record<string, unknown>;
    const pagePresetRefs: string[] = Array.isArray(pageData.presets)
      ? (pageData.presets as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    const collisions = detectCollisionsForPage(pageSlug, pagePresetRefs, globalRefs);
    allCollisions.push(...collisions);
  }

  // Deduplicate: same key + same source set should only appear once globally
  const seen = new Set<string>();
  const unique: Collision[] = [];
  for (const c of allCollisions) {
    const fingerprint = `${c.key}::${c.sources.sort().join("|")}`;
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      unique.push(c);
    }
  }

  if (unique.length === 0) {
    console.log(`No preset key collisions found across ${pages.length} pages.`);
    return;
  }

  console.error(
    `\nFound ${unique.length} preset key collision${unique.length === 1 ? "" : "s"}:\n`
  );
  for (const c of unique.sort((a, b) => a.key.localeCompare(b.key))) {
    console.error(`  key: "${c.key}"`);
    for (const src of c.sources) {
      const rel = path.relative(process.cwd(), src);
      console.error(`    ${rel}`);
    }
  }
  console.error(
    `\nPreset keys must be globally unique per page load. ` +
      `Fix by removing duplicate entries from content/data/presets.json ` +
      `or from page-level "presets" arrays.`
  );
  process.exit(1);
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
