import { describe, expect, it } from "vitest";
import { getRateLimitCookieSameSite } from "./rate-limit-cookie-samesite";

function setEnv(value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env.RATE_LIMIT_COOKIE_SAMESITE;
  else env.RATE_LIMIT_COOKIE_SAMESITE = value;
}

describe("getRateLimitCookieSameSite", () => {
  it("defaults to Lax when unset", () => {
    const prev = process.env.RATE_LIMIT_COOKIE_SAMESITE;
    try {
      setEnv(undefined);
      expect(getRateLimitCookieSameSite()).toBe("Lax");
    } finally {
      setEnv(prev);
    }
  });

  it("accepts Strict case-insensitively", () => {
    const prev = process.env.RATE_LIMIT_COOKIE_SAMESITE;
    try {
      setEnv("strict");
      expect(getRateLimitCookieSameSite()).toBe("Strict");
      setEnv("STRICT");
      expect(getRateLimitCookieSameSite()).toBe("Strict");
    } finally {
      setEnv(prev);
    }
  });

  it("accepts Lax case-insensitively", () => {
    const prev = process.env.RATE_LIMIT_COOKIE_SAMESITE;
    try {
      setEnv("lax");
      expect(getRateLimitCookieSameSite()).toBe("Lax");
    } finally {
      setEnv(prev);
    }
  });

  it("falls back to Lax for invalid values", () => {
    const prev = process.env.RATE_LIMIT_COOKIE_SAMESITE;
    try {
      setEnv("None");
      expect(getRateLimitCookieSameSite()).toBe("Lax");
      setEnv("garbage");
      expect(getRateLimitCookieSameSite()).toBe("Lax");
    } finally {
      setEnv(prev);
    }
  });
});
