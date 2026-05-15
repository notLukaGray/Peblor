import type { AnalyticsOptions, ProviderName } from "./types";

export function getAnalyticsOptions(): AnalyticsOptions {
  const provider = parseProvider();
  const enabled = parseOptionalBoolean("NEXT_PUBLIC_ANALYTICS_ENABLED", true);
  const debug = parseOptionalBoolean("NEXT_PUBLIC_ANALYTICS_DEBUG", false);
  const pageAllowlist = parsePathList("NEXT_PUBLIC_ANALYTICS_PAGE_ALLOWLIST");
  const pageDenylist = parsePathList("NEXT_PUBLIC_ANALYTICS_PAGE_DENYLIST");

  return {
    provider,
    enabled,
    debug,
    ...(pageAllowlist.length > 0 && { pageAllowlist }),
    ...(pageDenylist.length > 0 && { pageDenylist }),
  };
}

function parseProvider(): ProviderName {
  const raw = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER?.trim().toLowerCase();
  if (raw === "console") return "console";
  if (raw === "vercel") return "vercel";
  if (raw === "custom") return "custom";
  return "noop";
}

function parseOptionalBoolean(key: string, defaultVal: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (raw === undefined) return defaultVal;
  if (raw === "false" || raw === "0") return false;
  return true;
}

function parsePathList(key: string): string[] {
  const raw = process.env[key];
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
