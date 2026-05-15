import { NextRequest, NextResponse } from "next/server";
import { formRateLimitMaxPerHour } from "@/core/lib/globals";
import { buildFingerprint } from "@/core/lib/rate-limit/fingerprint";
import { getFormRateLimitState, getFormRateLimitCookieHeader } from "./form-rate-limit";
import { formRateLimitResponse } from "./form-responses";
import { rejectUntrustedFormPostOrigin } from "./form-same-origin";

export function checkFormRateLimit(
  request: NextRequest,
  handlerKey: string,
  maxPerHour: number = formRateLimitMaxPerHour
): NextResponse | null {
  const cookieHeader = request.headers.get("cookie");
  const fp = buildFingerprint(request, handlerKey);
  const { allowed } = getFormRateLimitState(cookieHeader, handlerKey, maxPerHour, fp);
  if (!allowed) {
    return formRateLimitResponse("Too many submissions. Please try again in an hour.", 3600);
  }
  return null;
}

export function applyFormRateLimit(
  request: NextRequest,
  handlerKey: string,
  maxPerHour: number = formRateLimitMaxPerHour
): { cookie: string } | NextResponse {
  const sameOriginRes = rejectUntrustedFormPostOrigin(request);
  if (sameOriginRes) return sameOriginRes;
  const rateLimitRes = checkFormRateLimit(request, handlerKey, maxPerHour);
  if (rateLimitRes) return rateLimitRes;
  const cookie = buildFormRateLimitCookie(request, handlerKey, maxPerHour);
  return { cookie };
}

export function buildFormRateLimitCookie(
  request: NextRequest,
  handlerKey: string,
  maxPerHour: number = formRateLimitMaxPerHour
): string {
  const fp = buildFingerprint(request, handlerKey);
  return getFormRateLimitCookieHeader(
    request.headers.get("cookie"),
    handlerKey,
    maxPerHour,
    fp,
    request.headers
  );
}
