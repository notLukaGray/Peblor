import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getTrustedFormSiteOrigins, rejectUntrustedFormPostOrigin } from "./form-same-origin";

function restoreEnv(keys: Record<string, string | undefined>) {
  const env = process.env as Record<string, string | undefined>;
  for (const [key, value] of Object.entries(keys)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

describe("rejectUntrustedFormPostOrigin", () => {
  it("allows all requests outside production", () => {
    const prev = process.env.NODE_ENV;
    const env = process.env as Record<string, string | undefined>;
    try {
      env.NODE_ENV = "development";
      const req = new NextRequest("https://evil.example/api/forms/contact", {
        method: "POST",
      });
      req.headers.set("origin", "https://evil.example");
      expect(rejectUntrustedFormPostOrigin(req)).toBeNull();
    } finally {
      restoreEnv({ NODE_ENV: prev });
    }
  });

  it("rejects in production when no trusted site URL is configured", () => {
    const prev: Record<string, string | undefined> = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      SITE_URL: process.env.SITE_URL,
      VERCEL_URL: process.env.VERCEL_URL,
    };
    const env = process.env as Record<string, string | undefined>;
    try {
      env.NODE_ENV = "production";
      delete env.NEXT_PUBLIC_SITE_URL;
      delete env.SITE_URL;
      delete env.VERCEL_URL;

      expect(getTrustedFormSiteOrigins()).toEqual([]);

      const req = new NextRequest("https://example.com/api/forms/contact", {
        method: "POST",
      });
      req.headers.set("origin", "https://example.com");
      const res = rejectUntrustedFormPostOrigin(req);
      expect(res?.status).toBe(403);
    } finally {
      restoreEnv(prev);
    }
  });

  it("allows production POST when Origin matches NEXT_PUBLIC_SITE_URL", () => {
    const prev: Record<string, string | undefined> = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      SITE_URL: process.env.SITE_URL,
      VERCEL_URL: process.env.VERCEL_URL,
    };
    const env = process.env as Record<string, string | undefined>;
    try {
      env.NODE_ENV = "production";
      env.NEXT_PUBLIC_SITE_URL = "https://mysite.example/";
      delete env.SITE_URL;
      delete env.VERCEL_URL;

      const req = new NextRequest("https://mysite.example/api/forms/contact", {
        method: "POST",
      });
      req.headers.set("origin", "https://mysite.example");
      expect(rejectUntrustedFormPostOrigin(req)).toBeNull();
    } finally {
      restoreEnv(prev);
    }
  });

  it("rejects production POST when Origin does not match trusted bases", () => {
    const prev: Record<string, string | undefined> = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      SITE_URL: process.env.SITE_URL,
      VERCEL_URL: process.env.VERCEL_URL,
    };
    const env = process.env as Record<string, string | undefined>;
    try {
      env.NODE_ENV = "production";
      env.NEXT_PUBLIC_SITE_URL = "https://mysite.example/";
      delete env.SITE_URL;
      delete env.VERCEL_URL;

      const req = new NextRequest("https://mysite.example/api/forms/contact", {
        method: "POST",
      });
      req.headers.set("origin", "https://evil.example");
      expect(rejectUntrustedFormPostOrigin(req)?.status).toBe(403);
    } finally {
      restoreEnv(prev);
    }
  });
});
