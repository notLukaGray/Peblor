/**
 * In-process rate-limit fingerprint buckets (SEC-8). Each server instance has its own map;
 * configure a shared backend later if you need cross-instance limits. `RATE_LIMIT_MEMORY_MAX`
 * caps entries; LRU eviction applies when full (documented operational limit, not a crypto bound).
 */
import { readPeblorConfig } from "@pb/core/lib/peblor-config";

function resolveMax(): number {
  const envVal = Number.parseInt(process.env.RATE_LIMIT_MEMORY_MAX ?? "", 10);
  if (Number.isFinite(envVal) && envVal > 0) return Math.min(envVal, 500_000);
  const config = readPeblorConfig();
  const cfgVal = config?.rateLimitMemoryMax;
  if (typeof cfgVal === "number" && cfgVal > 0) return Math.min(cfgVal, 500_000);
  return 1000;
}
const MAX = resolveMax();

type Entry = { count: number; ttl: number };

const store = new Map<string, Entry>();

function pruneExpired(now: number): void {
  for (const [key, entry] of store) {
    if (now > entry.ttl) store.delete(key);
  }
}

function evictLru(): void {
  const oldestKey = store.keys().next().value;
  if (oldestKey) store.delete(oldestKey);
}

export function rememberFingerprint(fp: string, count: number, ttlMs: number): void {
  const now = Date.now();
  pruneExpired(now);
  if (store.has(fp)) store.delete(fp);
  if (store.size >= MAX) {
    evictLru();
  }
  store.set(fp, { count, ttl: now + ttlMs });
}

export function getRememberedCount(fp: string): number | undefined {
  const entry = store.get(fp);
  if (!entry) return undefined;
  const now = Date.now();
  if (now > entry.ttl) {
    store.delete(fp);
    return undefined;
  }
  store.delete(fp);
  store.set(fp, entry);
  return entry.count;
}

/** Current in-memory fingerprint entry count and configured cap (ops / debug). */
export function getRateLimitMemoryStoreStats(): { size: number; max: number } {
  return { size: store.size, max: MAX };
}
