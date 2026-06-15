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
 * Validate a preset reference string. Accepts:
 *   - "category" (loads all presets from content/presets/category/)
 *   - "category.json" (legacy flat file)
 *   - "category/sub.json" (specific preset file or subdirectory)
 *   - "category/sub/preset.json" (deeply nested preset)
 * Each slash-separated segment must be a safe path segment.
 */
const SAFE_PRESET_REF_REGEX = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*(\/[a-zA-Z0-9_-]+\.json)?$/;

export function isSafePresetRef(ref: string): boolean {
  if (typeof ref !== "string" || ref.length === 0) return false;
  // Legacy flat .json filename (no slashes)
  if (!ref.includes("/") && ref.endsWith(".json")) return isSafeJsonFilename(ref);
  return SAFE_PRESET_REF_REGEX.test(ref);
}

/**
 * Validate a preset ref and resolve it to a filesystem path under baseDir.
 * If the ref ends with .json, it resolves to that exact file.
 * If the ref has no .json extension, it resolves to a directory to be walked.
 */
export function resolvePresetPath(
  baseDir: string,
  ref: string
): { kind: "file" | "dir"; path: string } | null {
  if (!isSafePresetRef(ref)) return null;
  const resolved = path.resolve(baseDir, ref);
  const baseResolved = path.resolve(baseDir);
  const relative = path.relative(baseResolved, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  if (ref.endsWith(".json")) return { kind: "file", path: resolved };

  // Check if legacy flat file exists
  const legacyFile = path.resolve(baseDir, `${ref}.json`);
  const legacyRelative = path.relative(baseResolved, legacyFile);
  if (!legacyRelative.startsWith("..") && !path.isAbsolute(legacyRelative)) {
    // Caller should stat to decide
  }

  return { kind: "dir", path: resolved };
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
