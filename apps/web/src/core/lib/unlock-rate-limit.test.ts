import { describe, expect, it } from "vitest";
import { getClearRateLimitCookieHeader, getRateLimitCookieHeader } from "./unlock-rate-limit";

function restoreEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

describe("unlock rate limit cookie SameSite", () => {
  it("includes SameSite=Strict when RATE_LIMIT_COOKIE_SAMESITE=Strict", () => {
    const prevSameSite = process.env.RATE_LIMIT_COOKIE_SAMESITE;
    const prevSitePassword = process.env.SITE_PASSWORD;
    const prevNodeEnv = process.env.NODE_ENV;
    const env = process.env as Record<string, string | undefined>;
    try {
      env.RATE_LIMIT_COOKIE_SAMESITE = "Strict";
      env.SITE_PASSWORD = "test-secret-for-rate-limit-cookie";
      env.NODE_ENV = "development";

      const set = getRateLimitCookieHeader(0, "fp-unlock-test");
      expect(set).toContain("SameSite=Strict");

      const clear = getClearRateLimitCookieHeader();
      expect(clear).toContain("SameSite=Strict");
    } finally {
      restoreEnv("RATE_LIMIT_COOKIE_SAMESITE", prevSameSite);
      restoreEnv("SITE_PASSWORD", prevSitePassword);
      restoreEnv("NODE_ENV", prevNodeEnv);
    }
  });
});
