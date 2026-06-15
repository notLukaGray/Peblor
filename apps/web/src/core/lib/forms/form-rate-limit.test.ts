import { describe, expect, it } from "vitest";
import {
  getClearFormRateLimitCookieHeader,
  getFormRateLimitCookieHeader,
  getFormRateLimitState,
} from "./form-rate-limit";

function restoreEnv(
  key: "NODE_ENV" | "FORM_RATE_LIMIT_SECRET" | "SITE_PASSWORD" | "RATE_LIMIT_COOKIE_SAMESITE",
  value: string | undefined
) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

describe("form rate limit secret handling", () => {
  it("allows SITE_PASSWORD as fallback in production when FORM_RATE_LIMIT_SECRET is missing", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevFormSecret = process.env.FORM_RATE_LIMIT_SECRET;
    const prevSitePassword = process.env.SITE_PASSWORD;
    const env = process.env as Record<string, string | undefined>;
    try {
      env.NODE_ENV = "production";
      delete env.FORM_RATE_LIMIT_SECRET;
      env.SITE_PASSWORD = "shared-password";

      const state = getFormRateLimitState(null, "contact", 5, "fp-test");
      const cookie = getFormRateLimitCookieHeader(null, "contact", 5, "fp-test");

      expect(state.allowed).toBe(true);
      expect(cookie).toContain("form_rate_contact=");
    } finally {
      restoreEnv("NODE_ENV", prevNodeEnv);
      restoreEnv("FORM_RATE_LIMIT_SECRET", prevFormSecret);
      restoreEnv("SITE_PASSWORD", prevSitePassword);
    }
  });

  it("fails closed in production when both FORM_RATE_LIMIT_SECRET and SITE_PASSWORD are missing", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevFormSecret = process.env.FORM_RATE_LIMIT_SECRET;
    const prevSitePassword = process.env.SITE_PASSWORD;
    const env = process.env as Record<string, string | undefined>;
    try {
      env.NODE_ENV = "production";
      delete env.FORM_RATE_LIMIT_SECRET;
      delete env.SITE_PASSWORD;

      const state = getFormRateLimitState(null, "contact", 5, "fp-test");
      const cookie = getFormRateLimitCookieHeader(null, "contact", 5, "fp-test");

      expect(state.allowed).toBe(false);
      expect(cookie).toBe("");
    } finally {
      restoreEnv("NODE_ENV", prevNodeEnv);
      restoreEnv("FORM_RATE_LIMIT_SECRET", prevFormSecret);
      restoreEnv("SITE_PASSWORD", prevSitePassword);
    }
  });

  it("includes SameSite=Strict when RATE_LIMIT_COOKIE_SAMESITE=Strict", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevFormSecret = process.env.FORM_RATE_LIMIT_SECRET;
    const prevSitePassword = process.env.SITE_PASSWORD;
    const prevSameSite = process.env.RATE_LIMIT_COOKIE_SAMESITE;
    const env = process.env as Record<string, string | undefined>;
    try {
      env.NODE_ENV = "development";
      delete env.FORM_RATE_LIMIT_SECRET;
      env.SITE_PASSWORD = "shared-password";
      env.RATE_LIMIT_COOKIE_SAMESITE = "Strict";

      const set = getFormRateLimitCookieHeader(null, "contact", 5, "fp-samesite");
      expect(set).toContain("SameSite=Strict");

      const clear = getClearFormRateLimitCookieHeader("contact");
      expect(clear).toContain("SameSite=Strict");
    } finally {
      restoreEnv("NODE_ENV", prevNodeEnv);
      restoreEnv("FORM_RATE_LIMIT_SECRET", prevFormSecret);
      restoreEnv("SITE_PASSWORD", prevSitePassword);
      restoreEnv("RATE_LIMIT_COOKIE_SAMESITE", prevSameSite);
    }
  });
});
