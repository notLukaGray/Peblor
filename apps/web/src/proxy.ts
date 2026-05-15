import { NextRequest, NextResponse } from "next/server";
import { PROTECTED_PAGE_PATHS } from "@/core/lib/protected-slugs.generated";
import { accessCookieName } from "@/core/lib/auth-constants";
import { verifyAccessTokenEdge } from "@/core/lib/access-cookie-edge";
import { validateRequiredRuntimeEnv } from "@/core/lib/required-runtime-env";

function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    `script-src 'unsafe-eval' 'strict-dynamic' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https: wss:",
    "object-src 'none'",
  ].join("; ");
}

function buildRequestedPathWithQuery(request: NextRequest): string {
  const params = new URLSearchParams(request.nextUrl.searchParams);
  params.delete("unlock");
  const query = params.toString();
  return query.length > 0 ? `${request.nextUrl.pathname}?${query}` : request.nextUrl.pathname;
}

function buildUnlockRedirectUrl(request: NextRequest): URL {
  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  url.searchParams.set("unlock_redirect", buildRequestedPathWithQuery(request));
  return url;
}

/**
 * Proxy for protected page paths:
 * When path is protected and SITE_PASSWORD is set:
 * - modal flow: requests already carrying `?unlock=1` are allowed through (used by internal links)
 * - direct/external/plain URL: redirect to `/unlock` with redirect target
 * - allow through when access cookie is valid
 *
 * NOTE: Do not rewrite to /mobile or /desktop variants. The app now uses
 * a universal catch-all route and resolves breakpoint from request headers.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
function applyCsp(response: NextResponse, nonce: string): NextResponse {
  response.headers.set("Content-Security-Policy", buildCspHeader(nonce));
  return response;
}

export async function proxy(request: NextRequest) {
  validateRequiredRuntimeEnv();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  if (typeof process.env.SITE_PASSWORD !== "string" || process.env.SITE_PASSWORD.length === 0) {
    return applyCsp(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  }

  const pathname = request.nextUrl.pathname;
  const normalizedPath = pathname.replace(/^\/+|\/+$/g, "");
  if (!normalizedPath || !PROTECTED_PAGE_PATHS.has(normalizedPath)) {
    return applyCsp(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  }

  const token = request.cookies.get(accessCookieName)?.value;
  const valid = await verifyAccessTokenEdge(token);
  const wantsUnlock = request.nextUrl.searchParams.get("unlock") === "1";

  if (!valid) {
    if (wantsUnlock)
      return applyCsp(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
    return NextResponse.redirect(buildUnlockRedirectUrl(request));
  }

  if (wantsUnlock) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("unlock");
    return NextResponse.redirect(url);
  }

  return applyCsp(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
