import path from "path";

/**
 * Allowlist for path segments used in page loading (slug, sectionKey, preset file basenames).
 * OWASP-style: define what is valid; reject everything else.
 * Allows: letters, digits, hyphen, underscore. No path separators, no "..", no leading dot.
 */
const SAFE_PATH_SEGMENT_REGEX = /^[a-zA-Z0-9_-]{1,200}$/;

/** True if the string is safe to use as a single path segment (slug, sectionKey, or file basename without extension). */
export function isSafePathSegment(segment: string): boolean {
  if (typeof segment !== "string" || segment.length === 0) return false;
  return SAFE_PATH_SEGMENT_REGEX.test(segment);
}

/** True if the string is a safe JSON filename (safe basename + ".json"). */
export function isSafeJsonFilename(filename: string): boolean {
  if (typeof filename !== "string" || !filename.endsWith(".json")) return false;
  const basename = filename.slice(0, -5);
  return basename.length > 0 && SAFE_PATH_SEGMENT_REGEX.test(basename);
}

function isSegmentSafe(segment: string): boolean {
  if (segment.endsWith(".json")) return isSafeJsonFilename(segment);
  return isSafePathSegment(segment);
}

/**
 * Join segments under baseDir and return the resolved path only if it stays under baseDir.
 * Segments are validated: allowlist (alphanumeric, hyphen, underscore); last segment may be "basename.json".
 * Returns null if any segment is invalid or path escapes.
 */
export function resolvePathUnder(baseDir: string, ...segments: string[]): string | null {
  for (const seg of segments) {
    if (!isSegmentSafe(seg)) return null;
  }
  const baseResolved = path.resolve(baseDir);
  const resolved = path.resolve(baseDir, ...segments);
  const relative = path.relative(baseResolved, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
}
