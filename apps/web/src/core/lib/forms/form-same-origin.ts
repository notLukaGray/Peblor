import type { NextRequest, NextResponse } from "next/server";
import { formErrorResponse } from "./form-responses";

function normalizeTrustedBase(raw: string | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  try {
    return new URL(withoutTrailingSlash).origin;
  } catch {
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
export function rejectUntrustedFormPostOrigin(request: NextRequest): NextResponse | null {
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

  let originMatches = false;
  if (originHeader) {
    try {
      const origin = new URL(originHeader).origin;
      originMatches = bases.some((base) => origin === base);
    } catch {
      originMatches = false;
    }
  }

  const refererMatches =
    refererHeader != null && bases.some((base) => refererMatchesBase(refererHeader, base));

  if (originMatches || refererMatches) return null;

  return formErrorResponse("Forbidden.", 403);
}
