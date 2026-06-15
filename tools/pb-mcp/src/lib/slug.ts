import path from "node:path";
import { PAGE_DATA_DIR } from "@pb/core/loader";

/**
 * Given an absolute path to a page index.json, derive the slug segments
 * needed for loadPeblorByPathAsync.
 *
 * Returns null if the file is outside PAGE_DATA_DIR, is not an index.json,
 * or has no slug segments (root index.json).
 */
export function filePathToSlugSegments(filePath: string): string[] | null {
  const abs = path.resolve(filePath);
  const base = path.resolve(PAGE_DATA_DIR);
  if (!abs.startsWith(base + path.sep)) return null;
  const rel = abs.slice(base.length + 1).replace(/\\/g, "/");
  if (rel === "index.json") return null;
  if (!rel.endsWith("/index.json")) return null;
  const segments = rel
    .replace(/\/index\.json$/, "")
    .split("/")
    .filter(Boolean);
  return segments.length > 0 ? segments : null;
}
