import fsPromises from "fs/promises";
import path from "path";
import { isSafePathSegment, resolvePathUnder } from "../peblor-paths";
import { parseJsonSafe } from "../../lib/shared-utils";
import { resolveContentDir as resolveContentDirFromConfig } from "../../lib/peblor-config";
import type { PeblorDefinitionBlock } from "@pb/contracts";

export { parseJsonSafe };

let _cachedContentDir: string | null = null;

function resolveContentDir(): string {
  if (_cachedContentDir) return _cachedContentDir;
  _cachedContentDir = resolveContentDirFromConfig();
  return _cachedContentDir;
}

export const CONTENT_DIR = resolveContentDir();
export const PAGE_DATA_DIR = path.join(CONTENT_DIR, "pages");
export const PAGE_IGNORE = new Set(["schema.example.json"]);

/**
 * Resolve the absolute content directory for a single-segment slug.
 * Single-segment slugs map to src/content/pages/{slug}.
 */
export function resolveSlugDir(slug: string): string | null {
  if (!isSafePathSegment(slug)) return null;
  return resolvePathUnder(PAGE_DATA_DIR, slug) ?? null;
}

/** Async read for parallel load phase. Returns null if file missing or invalid JSON. */
export async function readJsonFileSafe(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fsPromises.readFile(filePath, "utf-8");
    const result = parseJsonSafe<unknown>(raw);
    return result.ok ? result.data : null;
  } catch (err) {
    console.warn("[pb-core] Failed to read JSON file", filePath, err);
    return null;
  }
}

/**
 * Coerce unknown data into a preset map. Uses a lightweight type guard to filter
 * invalid entries — full Zod validation happens when the assembled page is parsed
 * in finalizeLoadedPeblor, so expensive per-preset parses here are redundant.
 */
export function coercePresetMap(data: unknown): Record<string, PeblorDefinitionBlock> {
  const out: Record<string, PeblorDefinitionBlock> = {};
  if (data == null || typeof data !== "object") return out;
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value == null || typeof value !== "object" || Array.isArray(value)) continue;
    const rec = value as Record<string, unknown>;
    if (typeof rec.type !== "string" && typeof rec.preset !== "string") continue;
    out[key] = rec as PeblorDefinitionBlock;
  }
  return out;
}

/**
 * Read page JSON from an absolute path resolved by resolvePagePath().
 * The path has already been validated by the discovery layer — do NOT call
 * with untrusted user input.
 * The slug parameter is the joined URL segments (e.g. "work/project-brand")
 * and is stored on the returned object for downstream consumers.
 */
export async function readPageJsonByPath(
  absolutePath: string,
  slug: string
): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fsPromises.readFile(absolutePath, "utf-8");
    const result = parseJsonSafe<Record<string, unknown>>(raw);
    if (!result.ok) return null;
    return { ...result.data, slug } as Record<string, unknown>;
  } catch (err) {
    console.warn("[pb-core] Failed to read/parse page JSON", absolutePath, slug, err);
    return null;
  }
}
