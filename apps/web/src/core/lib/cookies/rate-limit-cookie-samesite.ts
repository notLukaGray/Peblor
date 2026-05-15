import { readPeblorConfig } from "@pb/core/lib/peblor-config";

/** SameSite for unlock + form rate-limit cookies only (SEC-2). */
export type RateLimitCookieSameSite = "Lax" | "Strict";

export function getRateLimitCookieSameSite(): RateLimitCookieSameSite {
  const raw = process.env.RATE_LIMIT_COOKIE_SAMESITE?.trim();
  if (raw) {
    const lower = raw.toLowerCase();
    if (lower === "strict") return "Strict";
    if (lower === "lax") return "Lax";
  }
  const config = readPeblorConfig();
  const cfgVal = config?.rateLimitCookieSameSite;
  if (cfgVal === "Strict" || cfgVal === "Lax") return cfgVal;
  return "Lax";
}
