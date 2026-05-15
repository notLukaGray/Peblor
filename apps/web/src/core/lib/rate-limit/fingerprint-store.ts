/**
 * Fingerprint bucket store used by unlock and form rate limits (SEC-8).
 *
 * **In-process LRU only** (`./memory-store`): no extra npm dependencies. Each Node process has
 * its own map; tune `RATE_LIMIT_MEMORY_MAX` per instance. Cross-replica aggregation belongs in
 * infra you operate separately (sticky sessions, edge rate limits, or an external service), not
 * in this package.
 */
export {
  getRememberedCount,
  getRateLimitMemoryStoreStats,
  rememberFingerprint,
} from "./memory-store";
