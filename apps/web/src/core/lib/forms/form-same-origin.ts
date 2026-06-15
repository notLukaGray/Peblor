import type { NextResponse } from "next/server";
import { formErrorResponse } from "./form-responses";

const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Returns true when the URL origin is a localhost address (any port).
 * Allows password-protected forms to work during local development regardless
 * of NODE_ENV or NEXT_PUBLIC_SITE_URL configuration.
 */
export function isLocalhostOrigin(originOrUrl: string): boolean {
  try {
    const { hostname } = new URL(originOrUrl);
    return LOCALHOST_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

function normalizeTrustedBase(raw: string | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  try {
    return new URL(withoutTrailingSlash).origin;
  } catch (err) {
    console.warn("[web-core] Failed to normalize trusted base URL", raw, err);
    return null;
  }
}

/** Trusted site origins for production form POSTs, in precedence order (deduped). */
export function getTrustedFormSiteOrigins(): string[] {
  const bases: string[] = [];
  const push = (origin: string | null) => {
    if (origin && !bases.includes(origin)) bases.push(origin);
  };
  push(normalizeTrustedBase(process.env.NEXT_PUBLIC_SITE_URL));
  push(normalizeTrustedBase(process.env.SITE_URL));
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    push(normalizeTrustedBase(`https://${vercel}`));
  }
  return bases;
}

function refererMatchesBase(referer: string, base: string): boolean {
  return referer === base || referer.startsWith(`${base}/`) || referer.startsWith(`${base}?`);
}

/**
 * In production, require Origin or Referer to match a configured site URL.
 * Development skips this so local tests and tooling keep working.
 *
 * If production has no trusted origin (NEXT_PUBLIC_SITE_URL, SITE_URL, or
 * https://VERCEL_URL when VERCEL_URL is set), reject: misconfigured deploys must
 * not accept cross-site form POSTs.
 */
export function rejectUntrustedFormPostOrigin(request: { headers: Headers }): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const bases = getTrustedFormSiteOrigins();
  if (bases.length === 0) {
    return formErrorResponse(
      "Forbidden. Configure NEXT_PUBLIC_SITE_URL or SITE_URL (or deploy on a host that sets VERCEL_URL).",
      403
    );
  }

  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  if (originHeader) {
    let originMatches = false;
    try {
      const origin = new URL(originHeader).origin;
      originMatches = bases.some((base) => origin === base);
    } catch (err) {
      console.warn("[web-core] Failed to parse origin header for form CSRF check", err);
      originMatches = false;
    }
    return originMatches ? null : formErrorResponse("Forbidden.", 403);
  }

  if (refererHeader) {
    const refererMatches = bases.some((base) => refererMatchesBase(refererHeader, base));
    return refererMatches ? null : formErrorResponse("Forbidden.", 403);
  }

  return formErrorResponse("Forbidden.", 403);
}
