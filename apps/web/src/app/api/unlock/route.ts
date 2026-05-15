import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { withFormAnalytics } from "@/core/lib/forms/analytics-wrapper";
import {
  getAccessCookieHeader,
  getClearAccessCookieHeader,
  verifyAccessToken,
} from "@/core/lib/access-cookie";
import { accessCookieName } from "@/core/lib/auth-constants";
import { rateLimitMaxAttempts } from "@/core/lib/globals";
import { buildFingerprint } from "@/core/lib/rate-limit/fingerprint";
import {
  getUnlockRateLimitState,
  getRateLimitCookieHeader,
  getClearRateLimitCookieHeader,
  LOCKOUT_MS,
} from "@/core/lib/unlock-rate-limit";

type ParsedRequest = { password: string; redirect: string };

function buildErrorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function buildLockedResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error: "Too many failed attempts. Please try again later.",
      retryAfterSec,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

function buildSuccessResponse(redirect: string, headers: Headers): NextResponse {
  const accessCookieHeader = getAccessCookieHeader(headers);
  if (!accessCookieHeader) {
    return NextResponse.json({ error: "Could not set access cookie." }, { status: 500 });
  }
  const safeRedirect = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  const response = NextResponse.json({ ok: true, redirect: safeRedirect });
  response.headers.set("Set-Cookie", accessCookieHeader);
  response.headers.append("Set-Cookie", getClearRateLimitCookieHeader(headers));
  return response;
}

const MAX_UNLOCK_BODY_BYTES = 4 * 1024;

async function parseRequest(request: NextRequest): Promise<ParsedRequest | NextResponse> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_UNLOCK_BODY_BYTES) {
    return buildErrorResponse("Payload too large.", 413);
  }
  let body: { password?: string; redirect?: string };
  try {
    const text = await request.text();
    if (text.length > MAX_UNLOCK_BODY_BYTES) {
      return buildErrorResponse("Payload too large.", 413);
    }
    body = JSON.parse(text);
  } catch {
    return buildErrorResponse("Invalid body.", 400);
  }
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const redirect = typeof body.redirect === "string" ? body.redirect.trim() : "";
  return { password, redirect };
}

function validatePassword(password: string): boolean {
  const secret = process.env.SITE_PASSWORD;
  if (typeof secret !== "string") return false;
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function hasAllowedOriginHeader(originOrReferer: string | null): boolean {
  if (!originOrReferer) return false;
  const allowedRaw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const allowedOrigin = new URL(allowedRaw).origin;
    const requestOrigin = new URL(originOrReferer).origin;
    return requestOrigin === allowedOrigin;
  } catch {
    return false;
  }
}

async function unlockPostHandler(request: NextRequest) {
  const originOrReferer = request.headers.get("origin") || request.headers.get("referer");
  if (!hasAllowedOriginHeader(originOrReferer)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.SITE_PASSWORD;
  if (!secret) {
    return buildErrorResponse("Password protection is not configured.", 503);
  }

  const parsed = await parseRequest(request);
  if (parsed instanceof NextResponse) return parsed;
  const { password, redirect } = parsed;

  if (verifyAccessToken(request.cookies.get(accessCookieName)?.value)) {
    return buildSuccessResponse(redirect, request.headers);
  }

  if (!password) return buildErrorResponse("Password is required.", 400);

  const cookieHeader = request.headers.get("cookie");
  const fp = buildFingerprint(request, "unlock");
  const rateState = getUnlockRateLimitState(cookieHeader, fp);
  if (rateState.locked && rateState.lockedUntil != null) {
    const retryAfterSec = Math.max(1, Math.ceil((rateState.lockedUntil - Date.now()) / 1000));
    return buildLockedResponse(retryAfterSec);
  }

  if (!validatePassword(password)) {
    const rateLimitHeader = getRateLimitCookieHeader(rateState.count, fp, request.headers);
    const locked = rateState.count + 1 >= rateLimitMaxAttempts;
    const retryAfterSec = locked ? Math.max(1, Math.ceil(LOCKOUT_MS / 1000)) : undefined;
    const response = NextResponse.json(
      {
        error: locked
          ? "Too many failed attempts. Try again in 15 minutes."
          : "Incorrect password.",
        ...(retryAfterSec != null && { retryAfterSec }),
      },
      { status: 401 }
    );
    if (rateLimitHeader) response.headers.append("Set-Cookie", rateLimitHeader);
    if (retryAfterSec != null) response.headers.set("Retry-After", String(retryAfterSec));
    return response;
  }

  return buildSuccessResponse(redirect, request.headers);
}

export const POST = withFormAnalytics("unlock", unlockPostHandler);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("lock") !== "1") {
    return NextResponse.json({ error: "Use ?lock=1 to clear access." }, { status: 400 });
  }

  const originOrReferer = request.headers.get("origin") || request.headers.get("referer");
  if (!hasAllowedOriginHeader(originOrReferer)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const response = NextResponse.redirect(new URL("/", request.url), 302);
  response.headers.set("Set-Cookie", getClearAccessCookieHeader(request.headers));
  return response;
}
