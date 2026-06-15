import { cookies, headers } from "next/headers";
import { buildFingerprint } from "@/core/lib/rate-limit/fingerprint";
import {
  getFormRateLimitState,
  getFormRateLimitCookieHeader,
} from "@/core/lib/forms/form-rate-limit";
import { rejectUntrustedFormPostOrigin } from "@/core/lib/forms/form-same-origin";
import { formRateLimitMaxPerHour } from "@/core/lib/globals";

export type RateLimitResult = { ok: true } | { ok: false; error: string };

/**
 * Server-action-compatible rate-limit check.
 *
 * Reads cookies and headers via `next/headers` (available during server action
 * execution), builds a fingerprint, checks the existing rate-limit cookie, and
 * writes the updated cookie back so counts are persisted.
 *
 * Must be called from within a `"use server"` function.
 */
export async function checkActionRateLimit(
  handlerKey: string,
  maxPerHour: number = formRateLimitMaxPerHour
): Promise<RateLimitResult> {
  const headersList = await headers();
  const cookieStore = await cookies();

  // Same-origin check (production only)
  if (process.env.NODE_ENV === "production") {
    const originOrReferer = headersList.get("origin") ?? headersList.get("referer");
    if (!originOrReferer) {
      return { ok: false, error: "Forbidden." };
    }
    const mockHeaders = new Headers({ origin: originOrReferer });
    const rejection = rejectUntrustedFormPostOrigin({
      headers: mockHeaders,
    });
    if (rejection) {
      return { ok: false, error: "Forbidden." };
    }
  }

  // Build client fingerprint
  const fp = buildFingerprint({ headers: headersList as unknown as Headers }, handlerKey);

  // Serialise cookies into the header string the existing function expects
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  // Check current state
  const { allowed } = getFormRateLimitState(cookieHeader, handlerKey, maxPerHour, fp);
  if (!allowed) {
    return { ok: false, error: "Too many submissions. Please try again in an hour." };
  }

  // Build the updated cookie and persist it
  const cookieStr = getFormRateLimitCookieHeader(
    cookieHeader,
    handlerKey,
    maxPerHour,
    fp,
    headersList as unknown as Headers
  );
  if (cookieStr) {
    const match = cookieStr.match(/^([^=]+)=([^;]+)/);
    if (match?.[1] && match[2]) {
      try {
        cookieStore.set(match[1], match[2], {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 3600,
        });
      } catch (e) {
        console.warn("[rate-limit] Failed to set rate-limit cookie in server action", e);
      }
    }
  }

  return { ok: true };
}
