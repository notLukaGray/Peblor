import { NextResponse } from "next/server";

export type FormRateLimitCookie = { cookie: string };

/**
 * Shared form API contract: success, client error, rate limit, server error.
 * No sensitive data in response body; redirects are server-controlled.
 */

export function formSuccessResponse(redirect?: string): NextResponse {
  const body: { redirect?: string } = {};
  if (typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")) {
    body.redirect = redirect;
  }
  return NextResponse.json(body, { status: 200 });
}

export function formErrorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function formRateLimitResponse(message: string, retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: message, retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

export function safeFormRedirect(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : undefined;
}

export function withFormRateLimitCookie(
  response: NextResponse,
  rateLimit: FormRateLimitCookie
): NextResponse {
  response.headers.append("Set-Cookie", rateLimit.cookie);
  return response;
}
