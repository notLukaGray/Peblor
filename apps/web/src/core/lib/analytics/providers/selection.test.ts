import { describe, expect, it, beforeEach, vi } from "vitest";
import { getAnalyticsOptions } from "../config";
import { getProvider, registerProvider } from "../registry";
import { createNoopProvider } from "./noop";
import { createConsoleProvider } from "./console";
import { createVercelProvider } from "./vercel";

describe("provider selection", () => {
  beforeEach(() => {
    registerProvider("noop", createNoopProvider);
    registerProvider("console", createConsoleProvider);
    registerProvider("vercel", createVercelProvider);
  });

  it("NEXT_PUBLIC_ANALYTICS_PROVIDER=noop → noop provider", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "noop" }, () => {
      const opts = getAnalyticsOptions();
      expect(opts.provider).toBe("noop");
      const p = getProvider(opts);
      expect(p.name).toBe("noop");
    });
  });

  it("NEXT_PUBLIC_ANALYTICS_PROVIDER=console → console provider", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "console" }, () => {
      const opts = getAnalyticsOptions();
      expect(opts.provider).toBe("console");
      const p = getProvider(opts);
      expect(p.name).toBe("console");
    });
  });

  it("NEXT_PUBLIC_ANALYTICS_PROVIDER=vercel → vercel provider", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "vercel" }, () => {
      const opts = getAnalyticsOptions();
      expect(opts.provider).toBe("vercel");
      const p = getProvider(opts);
      expect(p.name).toBe("vercel");
    });
  });

  it("NEXT_PUBLIC_ANALYTICS_PROVIDER=unknown → falls back to noop", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    withEnv({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "unknown" }, () => {
      const opts = getAnalyticsOptions();
      expect(opts.provider).toBe("noop");
      const p = getProvider(opts);
      expect(p.name).toBe("noop");
    });
    consoleWarn.mockRestore();
  });

  it("NEXT_PUBLIC_ANALYTICS_PROVIDER unset → defaults to noop", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PROVIDER: undefined }, () => {
      const opts = getAnalyticsOptions();
      expect(opts.provider).toBe("noop");
      const p = getProvider(opts);
      expect(p.name).toBe("noop");
    });
  });
});

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    prev[key] = process.env[key];
    if (vars[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = vars[key];
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (prev[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev[key];
      }
    }
  }
}
