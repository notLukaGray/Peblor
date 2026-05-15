import { describe, expect, it } from "vitest";
import {
  getRateLimitMemoryStoreStats,
  getRememberedCount,
  rememberFingerprint,
} from "./fingerprint-store";

describe("fingerprint-store (facade)", () => {
  it("exposes stats with size and max", () => {
    const stats = getRateLimitMemoryStoreStats();
    expect(stats).toEqual({ size: expect.any(Number), max: expect.any(Number) });
    expect(stats.max).toBeGreaterThan(0);
    expect(stats.size).toBeGreaterThanOrEqual(0);
  });

  it("increments visible size for a new fingerprint key", () => {
    const key = `vitest-fp-${crypto.randomUUID()}`;
    const before = getRateLimitMemoryStoreStats().size;
    rememberFingerprint(key, 3, 60_000);
    expect(getRememberedCount(key)).toBe(3);
    expect(getRateLimitMemoryStoreStats().size).toBeGreaterThanOrEqual(before + 1);
  });
});
