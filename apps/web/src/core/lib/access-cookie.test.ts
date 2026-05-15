import { afterEach, describe, expect, it } from "vitest";
import { createAccessToken, verifyAccessToken, getAccessCookieHeader } from "./access-cookie";

const originalNodeEnv = process.env.NODE_ENV;
const originalAccessTokenVersion = process.env.ACCESS_TOKEN_VERSION;
const originalSitePassword = process.env.SITE_PASSWORD;
const env = process.env as Record<string, string | undefined>;

afterEach(() => {
  env.NODE_ENV = originalNodeEnv;
  if (originalAccessTokenVersion === undefined) {
    delete process.env.ACCESS_TOKEN_VERSION;
  } else {
    process.env.ACCESS_TOKEN_VERSION = originalAccessTokenVersion;
  }
  if (originalSitePassword === undefined) {
    delete process.env.SITE_PASSWORD;
  } else {
    process.env.SITE_PASSWORD = originalSitePassword;
  }
});

describe("createAccessToken", () => {
  it("falls back to local deploy id when ACCESS_TOKEN_VERSION is unset", () => {
    env.NODE_ENV = "production";
    process.env.SITE_PASSWORD = "test-secret";
    delete process.env.ACCESS_TOKEN_VERSION;

    expect(createAccessToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns empty string when SITE_PASSWORD is unset", () => {
    delete process.env.SITE_PASSWORD;
    expect(createAccessToken()).toBe("");
  });
});

describe("verifyAccessToken", () => {
  it("accepts a token produced by createAccessToken", () => {
    process.env.SITE_PASSWORD = "secret-a";
    delete process.env.ACCESS_TOKEN_VERSION;
    const token = createAccessToken();
    expect(token.length).toBeGreaterThan(0);
    expect(verifyAccessToken(token)).toBe(true);
  });

  it("rejects wrong token length or value", () => {
    process.env.SITE_PASSWORD = "secret-b";
    expect(verifyAccessToken("short")).toBe(false);
    expect(verifyAccessToken(undefined)).toBe(false);
  });
});

describe("getAccessCookieHeader", () => {
  it("sets Secure when x-forwarded-proto is https", () => {
    process.env.SITE_PASSWORD = "x";
    env.NODE_ENV = "development";
    const h = new Headers([["x-forwarded-proto", "https"]]);
    const line = getAccessCookieHeader(h);
    expect(line).toContain("Secure");
    expect(line).toMatch(/^[^=]+=/);
  });
});
