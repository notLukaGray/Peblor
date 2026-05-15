import { afterEach, describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { applyFormRateLimit } from "./with-form-rate-limit";

function buildRequest(_handlerKey: string, existingCookie?: string): NextRequest {
  const req = new NextRequest("https://example.com/api/forms/test", {
    method: "POST",
    body: JSON.stringify({ email: "bad" }),
  });
  req.headers.set("x-forwarded-for", "10.0.0.1");
  req.headers.set("user-agent", "vitest");
  if (existingCookie) {
    req.headers.set("cookie", existingCookie);
  }
  return req;
}

function extractCookieValue(header: string): string | null {
  const match = header.match(/^([^=]+)=([^;]+)/);
  return match?.[2]?.trim() ?? null;
}

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  FORM_RATE_LIMIT_SECRET: process.env.FORM_RATE_LIMIT_SECRET,
  SITE_PASSWORD: process.env.SITE_PASSWORD,
};

describe("applyFormRateLimit — charges on all attempts", () => {
  afterEach(() => {
    const env = process.env as Record<string, string | undefined>;
    if (originalEnv.NODE_ENV !== undefined) env.NODE_ENV = originalEnv.NODE_ENV;
    else delete env.NODE_ENV;
    if (originalEnv.FORM_RATE_LIMIT_SECRET !== undefined)
      env.FORM_RATE_LIMIT_SECRET = originalEnv.FORM_RATE_LIMIT_SECRET;
    else delete env.FORM_RATE_LIMIT_SECRET;
    if (originalEnv.SITE_PASSWORD !== undefined) env.SITE_PASSWORD = originalEnv.SITE_PASSWORD;
    else delete env.SITE_PASSWORD;
  });

  it("returns a rate-limit cookie on the very first attempt (increments before validation)", () => {
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "development";
    delete env.FORM_RATE_LIMIT_SECRET;
    env.SITE_PASSWORD = "test-password";

    const req = buildRequest("contact-test");
    const result = applyFormRateLimit(req, "contact-test");
    expect(result).not.toBeInstanceOf(NextResponse);
    const cookie = (result as { cookie: string }).cookie;
    expect(typeof cookie).toBe("string");
    expect(cookie.length).toBeGreaterThan(0);
  });

  it("charges on subsequent attempt even when validation would fail", () => {
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "development";
    delete env.FORM_RATE_LIMIT_SECRET;
    env.SITE_PASSWORD = "test-password";

    // First attempt
    const req1 = buildRequest("contact-test2");
    const r1 = applyFormRateLimit(req1, "contact-test2");
    expect(r1).not.toBeInstanceOf(NextResponse);
    const cookie1 = (r1 as { cookie: string }).cookie;

    // Second attempt (with cookie from first)
    const req2 = buildRequest("contact-test2", cookie1);
    const r2 = applyFormRateLimit(req2, "contact-test2");
    expect(r2).not.toBeInstanceOf(NextResponse);
    const cookie2 = (r2 as { cookie: string }).cookie;
    expect(typeof cookie2).toBe("string");

    // Cookie values should differ (new timestamp appended)
    const val1 = extractCookieValue(cookie1);
    const val2 = extractCookieValue(cookie2);
    expect(val1).not.toBeNull();
    expect(val2).not.toBeNull();
    expect(val1).not.toBe(val2);
  });
});
