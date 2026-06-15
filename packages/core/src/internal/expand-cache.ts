import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { CONTENT_DIR } from "./load/peblor-load-io";

export type ExpandCacheEntry = Record<string, unknown>;

// Module-level cache — survives between ISR renders in the same Node process.
// Keyed by a hash of source file mtimes.
const cache = new Map<string, { fileHash: string; entry: ExpandCacheEntry }>();

// Dev-mode TTL cache: entries live for 5 seconds after insert.
// This avoids re-running the full pipeline on every HMR during development
// while ensuring stale data doesn't persist beyond one hot-reload cycle.
const DEV_TTL_MS = 5_000;
const DEV_CACHE_MAX_SIZE = 200;
const devCache = new Map<string, { result: ExpandCacheEntry; timestamp: number }>();

// Production cache max size — evicts oldest entry when exceeded.
// Maps preserve insertion order, so oldest-key deletion is O(1).
const PROD_CACHE_MAX_SIZE = 500;

export function hashPageSources(pageFilePath: string): string {
  // Dev mode uses a TTL cache that ignores file hashes — skip the expensive
  // recursive stat of all preset files to avoid blocking the event loop on
  // every HMR / dev page load.
  if (process.env.NODE_ENV === "development") {
    return "dev";
  }

  const h = createHash("sha1");
  try {
    h.update(`${pageFilePath}:${fs.statSync(pageFilePath).mtimeMs}`);
  } catch (err) {
    console.warn("[pb-core] Failed to stat page file for hash", pageFilePath, err);
    h.update(`${pageFilePath}:missing`);
  }

  // Only hash the preset files this page actually references (extracted from
  // the page JSON "presets" array), not every preset on disk.  Editing an
  // unrelated preset no longer invalidates every cached page.
  //
  // Presets live as directories under content/presets/ (e.g. "bg" →
  // content/presets/bg/*.json).  We walk every file inside the directory so
  // that changing any file within a preset directory busts the ISR cache.
  const referencedPresets = readReferencedPresets(pageFilePath);
  const presetsDir = path.join(CONTENT_DIR, "presets");
  for (const presetName of referencedPresets) {
    const dirPath = path.join(presetsDir, presetName);
    try {
      // Walk all files inside the preset directory, sorted for determinism.
      const files = fs.readdirSync(dirPath, { recursive: true, encoding: "utf-8" });
      for (const file of files.sort()) {
        const fp = path.join(dirPath, file);
        try {
          h.update(`${fp}:${fs.statSync(fp).mtimeMs}`);
        } catch {
          // skip individual file-stat failures
        }
      }
    } catch {
      // Not a directory — fall back to flat .json file (for any legacy
      // presets that may still exist as files rather than directories).
      const fp = path.join(presetsDir, `${presetName}.json`);
      try {
        h.update(`${fp}:${fs.statSync(fp).mtimeMs}`);
      } catch {
        h.update(`${presetName}:missing`);
      }
    }
  }

  return h.digest("hex");
}

/**
 * Read the page JSON and return the list of preset keys it declares.
 * Returns an empty array when the file can't be read or has no presets field.
 */
function readReferencedPresets(pageFilePath: string): string[] {
  try {
    const raw = fs.readFileSync(pageFilePath, "utf-8");
    const parsed = JSON.parse(raw) as { presets?: string[] };
    return Array.isArray(parsed.presets) ? parsed.presets : [];
  } catch {
    return [];
  }
}

export function getCached(route: string, fileHash: string): ExpandCacheEntry | null {
  if (process.env.NODE_ENV === "development") {
    const dev = devCache.get(route);
    if (dev) {
      const elapsed = Date.now() - dev.timestamp;
      if (elapsed < DEV_TTL_MS) {
        return dev.result;
      }
      // Entry expired — clean it up
      devCache.delete(route);
    }
    return null;
  }
  const cached = cache.get(route);
  if (!cached) return null;
  if (cached.fileHash !== fileHash) {
    cache.delete(route);
    return null;
  }
  return cached.entry;
}

export function setCached(route: string, fileHash: string, entry: Record<string, unknown>): void {
  // Shallow clone the entry to prevent cache consumers from leaking
  // mutations back into the shared cache entry.
  const cloned = { ...entry };

  if (process.env.NODE_ENV === "development") {
    // Evict oldest entry when the cache exceeds the size bound.
    // Long dev sessions navigating many unique routes should not leak memory.
    // Map preserves insertion order, so the oldest key is always first — O(1).
    if (devCache.size >= DEV_CACHE_MAX_SIZE) {
      const oldestKey = devCache.keys().next().value as string | undefined;
      if (oldestKey) devCache.delete(oldestKey);
    }
    devCache.set(route, { result: cloned, timestamp: Date.now() });
    return;
  }

  // Production cache eviction: LRU by insertion order (Map preserves insertion order).
  if (cache.size >= PROD_CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(route, { fileHash, entry: cloned });
}

export function invalidateCached(route: string): void {
  cache.delete(route);
  devCache.delete(route);
}
