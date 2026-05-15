import { afterEach, describe, expect, it, vi } from "vitest";
import { buildFingerprint } from "./fingerprint";

const originalNodeEnv = process.env.NODE_ENV;
const originalRateLimitSecret = process.env.RATE_LIMIT_SECRET;
const env = process.env as Record<string, string | undefined>;

afterEach(() => {
  env.NODE_ENV = originalNodeEnv;
  if (originalRateLimitSecret === undefined) {
    delete process.env.RATE_LIMIT_SECRET;
  } else {
    process.env.RATE_LIMIT_SECRET = originalRateLimitSecret;
  }
  vi.restoreAllMocks();
});

describe("buildFingerprint", () => {
  it("falls back to deterministic dev hash when RATE_LIMIT_SECRET is unset", () => {
    env.NODE_ENV = "production";
    delete process.env.RATE_LIMIT_SECRET;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const fp = buildFingerprint({ headers: new Headers() }, "unlock");
    expect(fp).toMatch(/^[a-f0-9]{64}$/);
    expect(warn).toHaveBeenCalled();
  });
});
