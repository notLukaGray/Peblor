import { createHmac, timingSafeEqual } from "crypto";
import {
  rateLimitCookieName,
  rateLimitMaxAttempts,
  rateLimitLockoutMinutes,
  rateLimitCookieExpiryHours,
} from "./globals";
import type { CookieAttrs } from "./cookies/build-cookie-header";
import { getRateLimitCookieSameSite } from "./cookies/rate-limit-cookie-samesite";
import { isRequestHttps } from "./cookies/cookie-request-secure";
import { getRememberedCount, rememberFingerprint } from "./rate-limit/fingerprint-store";

type RateLimitPayload = {
  count: number;
  lockedUntil?: number;
  fp?: string;
};

function getSecret(): string | undefined {
  return process.env.SITE_PASSWORD;
}

function sign(payload: string): string {
  const secret = getSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function verify(payload: string, signature: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
  } catch (err) {
    console.warn("[web-core] timingSafeEqual failed for rate limit signature verification", err);
    return false;
  }
}

export function getUnlockRateLimitState(
  cookieHeader: string | null,
  fp?: string
): {
  locked: boolean;
  lockedUntil?: number;
  count: number;
} {
  const remembered = fp ? getRememberedCount(fp) : undefined;

  if (!cookieHeader) {
    return { locked: false, count: remembered ?? 0 };
  }

  const match = cookieHeader.match(new RegExp(`${rateLimitCookieName}=([^;]+)`));
  const value = match?.[1]?.trim();
  if (!value) return { locked: false, count: remembered ?? 0 };

  const [payloadB64, signature] = value.split(".");
  if (!payloadB64 || !signature || !verify(payloadB64, signature)) {
    return { locked: false, count: remembered ?? 0 };
  }

  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const data = JSON.parse(json) as RateLimitPayload;
    const count = typeof data.count === "number" ? data.count : 0;
    const lockedUntil = typeof data.lockedUntil === "number" ? data.lockedUntil : undefined;

    const cookieFp = typeof data.fp === "string" ? data.fp : undefined;

    let effectiveCount = count;

    if (fp && cookieFp !== fp) {
      const remembered = getRememberedCount(fp);
      if (remembered != null) {
        effectiveCount = remembered;
      } else {
        effectiveCount = 0;
      }
    }

    const now = Date.now();
    if (lockedUntil != null && now < lockedUntil) {
      return { locked: true, lockedUntil, count: effectiveCount };
    }
    // Lockout window elapsed — do not keep a stale attempt count that re-triggers lockout.
    if (lockedUntil != null && now >= lockedUntil) {
      return { locked: false, count: 0 };
    }
    return { locked: false, count: effectiveCount };
  } catch (err) {
    console.warn("[web-core] Failed to parse rate limit state", err);
    return { locked: false, count: remembered ?? 0 };
  }
}

export function getRateLimitCookieHeader(
  currentCount: number,
  fp?: string,
  headers?: Headers
): CookieAttrs | null {
  const count = currentCount + 1;
  const now = Date.now();
  const lockoutMs = rateLimitLockoutMinutes * 60 * 1000;
  const lockedUntil = count >= rateLimitMaxAttempts ? now + lockoutMs : undefined;

  if (fp) {
    rememberFingerprint(fp, count, lockoutMs + 60_000);
  }

  const payload: RateLimitPayload = {
    count,
    ...(fp != null && { fp }),
    ...(lockedUntil != null && { lockedUntil }),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(payloadB64);
  if (!signature) return null;

  const value = `${payloadB64}.${signature}`;
  const cookieExpirySeconds = rateLimitCookieExpiryHours * 60 * 60;
  const maxAge = lockedUntil != null ? Math.ceil((lockedUntil - now) / 1000) : cookieExpirySeconds;
  const secure = headers ? isRequestHttps(headers) : process.env.NODE_ENV === "production";
  return {
    name: rateLimitCookieName,
    value,
    maxAge,
    secure,
    sameSite: getRateLimitCookieSameSite(),
  };
}

export function getClearRateLimitCookieHeader(headers?: Headers): CookieAttrs {
  const secure = headers ? isRequestHttps(headers) : process.env.NODE_ENV === "production";
  return {
    name: rateLimitCookieName,
    value: "",
    maxAge: 0,
    secure,
    sameSite: getRateLimitCookieSameSite(),
  };
}

export const RATE_LIMIT_COOKIE_NAME = rateLimitCookieName;
export const MAX_ATTEMPTS = rateLimitMaxAttempts;
export const LOCKOUT_MS = rateLimitLockoutMinutes * 60 * 1000;
