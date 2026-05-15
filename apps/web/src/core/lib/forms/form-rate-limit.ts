import { createHmac, timingSafeEqual } from "crypto";
import { buildCookieHeader } from "../cookies/build-cookie-header";
import { getRateLimitCookieSameSite } from "../cookies/rate-limit-cookie-samesite";
import { isRequestHttps } from "../cookies/cookie-request-secure";
import { getRememberedCount, rememberFingerprint } from "../rate-limit/fingerprint-store";

const DEFAULT_MAX_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

type Payload = { timestamps: number[]; fp?: string };

function getSecret(): string | undefined {
  const dedicated = process.env.FORM_RATE_LIMIT_SECRET;
  if (typeof dedicated === "string" && dedicated.length > 0) return dedicated;
  if (process.env.NODE_ENV === "production") return undefined;
  return process.env.SITE_PASSWORD;
}

function isMisconfiguredProdSecret(): boolean {
  return process.env.NODE_ENV === "production" && !getSecret();
}

let warnedMissingFormRateLimitSecret = false;

function warnMissingFormRateLimitSecretOnce(): void {
  if (warnedMissingFormRateLimitSecret) return;
  warnedMissingFormRateLimitSecret = true;
  console.error(
    "[form-rate-limit] FORM_RATE_LIMIT_SECRET is not set in production. " +
      "Form rate-limit cookies cannot be signed; all form submissions are rejected until this is configured."
  );
}

function getCookieName(handlerKey: string): string {
  return `form_rate_${handlerKey.replace(/[^a-z0-9-]/gi, "_")}`;
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
  } catch {
    return false;
  }
}

function parseCookie(cookieHeader: string | null, handlerKey: string): Payload | null {
  if (!cookieHeader) return null;
  const name = getCookieName(handlerKey);
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  const value = match?.[1]?.trim();
  if (!value) return null;
  const [payloadB64, sig] = value.split(".");
  if (!payloadB64 || !sig || !verify(payloadB64, sig)) return null;
  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const data = JSON.parse(json) as Payload;
    return Array.isArray(data.timestamps) ? data : null;
  } catch {
    return null;
  }
}

export function getFormRateLimitState(
  cookieHeader: string | null,
  handlerKey: string,
  maxPerHour: number = DEFAULT_MAX_PER_HOUR,
  fp?: string
): { count: number; allowed: boolean } {
  if (isMisconfiguredProdSecret()) {
    warnMissingFormRateLimitSecretOnce();
    return { count: maxPerHour, allowed: false };
  }
  const payload = parseCookie(cookieHeader, handlerKey);

  if (!payload) {
    const remembered = fp ? getRememberedCount(fp) : undefined;
    const count = remembered ?? 0;
    return { count, allowed: count < maxPerHour };
  }

  const now = Date.now();
  const cutoff = now - HOUR_MS;
  let recent = payload.timestamps.filter((t) => typeof t === "number" && t > cutoff);

  const cookieFp = typeof payload.fp === "string" ? payload.fp : undefined;

  if (fp && cookieFp !== fp) {
    const remembered = getRememberedCount(fp);
    if (remembered != null) {
      recent = Array.from({ length: remembered }, () => cutoff + 1);
    } else {
      recent = [];
    }
  } else if (fp && cookieFp === fp) {
    const remembered = getRememberedCount(fp);
    if (remembered != null && remembered > recent.length) {
      recent = Array.from({ length: remembered }, () => cutoff + 1);
    }
  }

  return { count: recent.length, allowed: recent.length < maxPerHour };
}

export function getFormRateLimitCookieHeader(
  cookieHeader: string | null,
  handlerKey: string,
  maxPerHour: number = DEFAULT_MAX_PER_HOUR,
  fp?: string,
  headers?: Headers
): string {
  if (isMisconfiguredProdSecret()) {
    warnMissingFormRateLimitSecretOnce();
    return "";
  }
  const payload = parseCookie(cookieHeader, handlerKey);
  const now = Date.now();
  const cutoff = now - HOUR_MS;
  const timestamps = payload?.timestamps ?? [];
  const recent = [...timestamps.filter((t: number) => t > cutoff), now].slice(-maxPerHour);

  if (fp) {
    rememberFingerprint(fp, recent.length, HOUR_MS);
  }

  const data: Payload = { timestamps: recent, ...(fp != null && { fp }) };
  const payloadB64 = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const signature = sign(payloadB64);
  if (!signature) return "";
  const name = getCookieName(handlerKey);
  const value = `${payloadB64}.${signature}`;
  const secure = headers ? isRequestHttps(headers) : process.env.NODE_ENV === "production";
  return buildCookieHeader({
    name,
    value,
    maxAge: 3600,
    secure,
    sameSite: getRateLimitCookieSameSite(),
  });
}

export function getClearFormRateLimitCookieHeader(handlerKey: string, headers?: Headers): string {
  const secure = headers ? isRequestHttps(headers) : process.env.NODE_ENV === "production";
  return buildCookieHeader({
    name: getCookieName(handlerKey),
    value: "",
    maxAge: 0,
    secure,
    sameSite: getRateLimitCookieSameSite(),
  });
}
