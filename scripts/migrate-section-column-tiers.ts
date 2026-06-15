#!/usr/bin/env npx tsx
/**
 * Codemod: migrate section-column responsive objects from legacy {mobile, desktop}
 * shapes to canonical tier maps {base, md}.
 *
 * Converts for SECTION-COLUMN responsive fields only:
 *   { "mobile": X }              → { "base": X }
 *   { "desktop": Y }             → { "md": Y }
 *   { "mobile": X, "desktop": Y } → { "base": X, "md": Y }
 *
 * Only the keys are renamed — inner values are preserved byte-for-byte.
 * Absent keys are dropped (not defaulted), so mobile-only → base-only, which
 * cascades desktop→base the same way mobile→mobile did in the legacy resolver.
 *
 * Safe to re-run: idempotent (objects already using {base, md} are skipped).
 *
 * Section-column fields covered:
 *   columns, columnWidths, columnGaps, columnStyles, itemStyles,
 *   gridMode, itemLayout, elementOrder, columnAssignments, columnSpan
 */

import fs from "fs";
import path from "path";
import { glob } from "fast-glob";

// ---------------------------------------------------------------------------
// Field allowlist — section-column subsystem fields that accept responsive objects
// ---------------------------------------------------------------------------

const SECTION_COLUMN_RESPONSIVE_FIELDS = new Set<string>([
  "columns",
  "columnWidths",
  "columnGaps",
  "columnStyles",
  "itemStyles",
  "gridMode",
  "itemLayout",
  "elementOrder",
  "columnAssignments",
  "columnSpan",
]);

// ---------------------------------------------------------------------------
// Conversion logic
// ---------------------------------------------------------------------------

/**
 * Attempt to convert a value for a given field key.
 * Returns the converted value, or undefined if no conversion is needed/safe.
 *
 * Converts { mobile?, desktop? } → { base?, md? } by renaming keys.
 * Skips objects that are already tier-maps ({ base, md, ... }).
 */
function convertValue(key: string, value: unknown): unknown | undefined {
  // Only process section-column fields
  if (!SECTION_COLUMN_RESPONSIVE_FIELDS.has(key)) return undefined;

  // Only process non-null objects (not arrays)
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);

  // Skip if already a canonical tier-map (has base/md/sm/lg/xl/2xl keys)
  const TIER_KEYS = new Set(["base", "sm", "md", "lg", "xl", "2xl", "@container"]);
  if (keys.length > 0 && keys.every((k) => TIER_KEYS.has(k))) return undefined;

  // Only convert if all keys are a subset of {mobile, desktop} (at least one present)
  if (
    keys.length >= 1 &&
    keys.length <= 2 &&
    keys.every((k) => k === "mobile" || k === "desktop")
  ) {
    const result: Record<string, unknown> = {};
    if ("mobile" in obj) result.base = obj.mobile;
    if ("desktop" in obj) result.md = obj.desktop;
    return result;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Deep walk and transform
// ---------------------------------------------------------------------------

type Counts = Map<string, number>;

function walkAndTransform(data: unknown, counts: Counts): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => walkAndTransform(item, counts));
  }
  if (data !== null && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const converted = convertValue(key, value);
      if (converted !== undefined) {
        result[key] = converted;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      } else {
        result[key] = walkAndTransform(value, counts);
      }
    }
    return result;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const contentDir = path.resolve(import.meta.dirname ?? __dirname, "../content");

  // Glob all JSON files under content/, excluding the generated schemas/ directory
  const files = await glob("**/*.json", {
    cwd: contentDir,
    ignore: ["schemas/**"],
    absolute: true,
    onlyFiles: true,
  });

  console.log(`Found ${files.length} JSON files to process.\n`);

  const totalCounts: Counts = new Map();
  let filesModified = 0;
  let filesSkipped = 0;

  for (const filePath of files.sort()) {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      console.error(`ERROR reading ${filePath}: ${err}`);
      continue;
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`ERROR parsing ${filePath}: ${err}`);
      continue;
    }

    const localCounts: Counts = new Map();
    const transformed = walkAndTransform(data, localCounts);

    if (localCounts.size === 0) {
      filesSkipped++;
      continue;
    }

    // Merge local counts into total
    for (const [key, count] of localCounts) {
      totalCounts.set(key, (totalCounts.get(key) ?? 0) + count);
    }

    // Write back — use 2-space indent to match existing content formatting
    const newRaw = JSON.stringify(transformed, null, 2) + "\n";
    try {
      fs.writeFileSync(filePath, newRaw, "utf-8");
    } catch (err) {
      console.error(`ERROR writing ${filePath}: ${err}`);
      continue;
    }

    const relativePath = path.relative(contentDir, filePath);
    const summary = Array.from(localCounts.entries())
      .map(([k, n]) => `${k}(${n})`)
      .join(", ");
    console.log(`  MODIFIED ${relativePath} [${summary}]`);
    filesModified++;
  }

  console.log("\n=== Migration summary ===");
  console.log(`Files modified:  ${filesModified}`);
  console.log(`Files unchanged: ${filesSkipped}`);
  console.log(`\nPer-field conversion counts:`);

  const sorted = Array.from(totalCounts.entries()).sort(([, a], [, b]) => b - a);
  let total = 0;
  for (const [key, count] of sorted) {
    console.log(`  ${key.padEnd(22)} ${count}`);
    total += count;
  }
  console.log(`  ${"TOTAL".padEnd(22)} ${total}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
