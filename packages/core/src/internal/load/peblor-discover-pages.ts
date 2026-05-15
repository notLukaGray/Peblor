/**
 * Filesystem-driven page discovery.
 *
 * Pages live in src/content/pages/ in a directory structure that mirrors URLs:
 *   src/content/pages/work/project-brand/index.json  →  URL /work/project-brand
 *   src/content/pages/work/index.json                →  URL /work
 *
 * Any index.json found recursively under PAGE_DATA_DIR is a page.
 *
 * Reserved variant segments: "mobile" and "desktop".
 * These are appended by the catch-all route to encode device type — they must
 * never appear as real page slug segments.
 */

import fs from "fs";
import path from "path";
import { isSafePathSegment } from "../peblor-paths";
import { PAGE_DATA_DIR } from "./peblor-load-io";
import { sortedReaddir } from "./sorted-readdir";

export type PageEntry = {
  /** URL-segment array for this page, e.g. ['work', 'project-brand']. */
  slugSegments: string[];
  /** Absolute path to the index.json file for this page. */
  contentPath: string;
};

const RESERVED_SEGMENTS = new Set<string>(["mobile", "desktop"]);

/** Throw a clear error if any segment is a reserved variant name. */
function assertNoReservedSegments(segments: string[]): void {
  for (const seg of segments) {
    if (RESERVED_SEGMENTS.has(seg)) {
      throw new Error(
        `Page slug segment "${seg}" is reserved for device variants and cannot be used as a page slug segment.`
      );
    }
  }
}

/**
 * Recursively scan dir for index.json files.
 * Returns each as a PageEntry with slugSegments relative to PAGE_DATA_DIR.
 */
async function scanDir(dir: string, relativeSegments: string[]): Promise<PageEntry[]> {
  let entries: PageEntry[] = [];

  let children: string[];
  try {
    children = await sortedReaddir(dir);
  } catch {
    return entries;
  }

  for (const child of children) {
    // Check for index.json at this level
    if (child === "index.json") {
      const contentPath = path.join(dir, "index.json");
      if (relativeSegments.length === 0) {
        // index.json at the root of PAGE_DATA_DIR — skip (no slug segments)
        continue;
      }
      assertNoReservedSegments(relativeSegments);
      entries.push({ slugSegments: [...relativeSegments], contentPath });
      continue;
    }

    // Recurse into subdirectories that are safe path segments
    if (!isSafePathSegment(child)) continue;
    const childPath = path.join(dir, child);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(childPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    entries = entries.concat(await scanDir(childPath, [...relativeSegments, child]));
  }

  return entries;
}

const isDev = process.env.NODE_ENV !== "production";

/** Module-level cache — populated on first call, reused for the lifetime of the process. */
let cachedPages: PageEntry[] | null = null;

/**
 * Scan src/content/pages/ recursively and return every page as a PageEntry.
 * Result is cached in memory after the first call.
 */
export async function discoverAllPages(): Promise<PageEntry[]> {
  if (!isDev && cachedPages !== null) return cachedPages;
  try {
    await fs.promises.access(PAGE_DATA_DIR);
  } catch {
    cachedPages = [];
    return cachedPages;
  }
  const result = await scanDir(PAGE_DATA_DIR, []);
  if (!isDev) cachedPages = result;
  return result;
}

/**
 * Given URL slug segments (e.g. ['work', 'project-brand']), return the absolute
 * path to the corresponding index.json, or null if no page exists at that path.
 *
 * Throws if any segment is a reserved variant name.
 */
export async function resolvePagePath(slugSegments: string[]): Promise<string | null> {
  if (slugSegments.length === 0) return null;

  // Validate each segment individually
  for (const seg of slugSegments) {
    if (!isSafePathSegment(seg)) return null;
  }

  assertNoReservedSegments(slugSegments);

  // Build absolute candidate path
  const candidate = path.join(PAGE_DATA_DIR, ...slugSegments, "index.json");

  // Confirm the lexical path stays under PAGE_DATA_DIR (fast traversal guard)
  const resolved = path.resolve(candidate);
  const base = path.resolve(PAGE_DATA_DIR);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;

  try {
    await fs.promises.access(resolved);
    const [realResolved, realBase] = await Promise.all([
      fs.promises.realpath(resolved),
      fs.promises.realpath(base),
    ]);
    if (!realResolved.startsWith(realBase + path.sep) && realResolved !== realBase) return null;
    return realResolved;
  } catch {
    return null;
  }
}
