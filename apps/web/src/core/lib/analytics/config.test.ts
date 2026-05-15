import { describe, expect, it } from "vitest";
import { getAnalyticsOptions } from "./config";

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

describe("getAnalyticsOptions", () => {
  it("returns defaults when no env vars set", () => {
    withEnv(
      {
        NEXT_PUBLIC_ANALYTICS_PROVIDER: undefined,
        NEXT_PUBLIC_ANALYTICS_ENABLED: undefined,
        NEXT_PUBLIC_ANALYTICS_DEBUG: undefined,
        NEXT_PUBLIC_ANALYTICS_PAGE_ALLOWLIST: undefined,
        NEXT_PUBLIC_ANALYTICS_PAGE_DENYLIST: undefined,
      },
      () => {
        const opts = getAnalyticsOptions();
        expect(opts.provider).toBe("noop");
        expect(opts.enabled).toBe(true);
        expect(opts.debug).toBe(false);
        expect(opts.pageAllowlist).toBeUndefined();
        expect(opts.pageDenylist).toBeUndefined();
      }
    );
  });

  it("parses NEXT_PUBLIC_ANALYTICS_PROVIDER=console", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "console" }, () => {
      expect(getAnalyticsOptions().provider).toBe("console");
    });
  });

  it("parses NEXT_PUBLIC_ANALYTICS_PROVIDER=vercel", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "vercel" }, () => {
      expect(getAnalyticsOptions().provider).toBe("vercel");
    });
  });

  it("parses NEXT_PUBLIC_ANALYTICS_PROVIDER=custom", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "custom" }, () => {
      expect(getAnalyticsOptions().provider).toBe("custom");
    });
  });

  it('parses NEXT_PUBLIC_ANALYTICS_PROVIDER=unknown → falls back to "noop"', () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "unknown" }, () => {
      expect(getAnalyticsOptions().provider).toBe("noop");
    });
  });

  it("parses NEXT_PUBLIC_ANALYTICS_ENABLED=false", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_ENABLED: "false" }, () => {
      expect(getAnalyticsOptions().enabled).toBe(false);
    });
  });

  it("parses NEXT_PUBLIC_ANALYTICS_ENABLED=0 as false", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_ENABLED: "0" }, () => {
      expect(getAnalyticsOptions().enabled).toBe(false);
    });
  });

  it("parses NEXT_PUBLIC_ANALYTICS_DEBUG=true", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_DEBUG: "true" }, () => {
      expect(getAnalyticsOptions().debug).toBe(true);
    });
  });

  it("parses NEXT_PUBLIC_ANALYTICS_DEBUG=1 as true", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_DEBUG: "1" }, () => {
      expect(getAnalyticsOptions().debug).toBe(true);
    });
  });

  it("parses allowlist with comma-separated paths", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PAGE_ALLOWLIST: "/work/foo,/work/bar" }, () => {
      const opts = getAnalyticsOptions();
      expect(opts.pageAllowlist).toEqual(["/work/foo", "/work/bar"]);
    });
  });

  it("parses denylist with comma-separated paths", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PAGE_DENYLIST: "/dev,/playground" }, () => {
      const opts = getAnalyticsOptions();
      expect(opts.pageDenylist).toEqual(["/dev", "/playground"]);
    });
  });

  it("trims whitespace from list entries", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PAGE_ALLOWLIST: " /foo , /bar " }, () => {
      const opts = getAnalyticsOptions();
      expect(opts.pageAllowlist).toEqual(["/foo", "/bar"]);
    });
  });

  it("filters empty list entries", () => {
    withEnv({ NEXT_PUBLIC_ANALYTICS_PAGE_ALLOWLIST: "/foo,,/bar," }, () => {
      const opts = getAnalyticsOptions();
      expect(opts.pageAllowlist).toEqual(["/foo", "/bar"]);
    });
  });
});
