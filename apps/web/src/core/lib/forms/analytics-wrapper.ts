import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { trackServer } from "@/core/lib/analytics";

export type RouteHandler = (request: NextRequest) => Promise<NextResponse> | NextResponse;

export function normalizePagePath(referer: string): string {
  if (!referer) return "";
  const lower = referer.toLowerCase().trim();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return "";
  }
  try {
    const url = new URL(referer, "http://localhost");
    return url.pathname || "";
  } catch (err) {
    console.warn("[web-core] Failed to normalize page path from referer", err);
    return "";
  }
}

export function withFormAnalytics(handlerKey: string, handler: RouteHandler): RouteHandler {
  return async (request) => {
    const rawReferer = request.headers.get("referer") ?? "";
    const referer = normalizePagePath(rawReferer);
    await trackServer("form_submit_attempt", { pagePath: referer, handlerKey });

    try {
      const response = await handler(request);

      if (response.status >= 400) {
        await trackServer("form_submit_error", {
          pagePath: referer,
          handlerKey,
          errorType: String(response.status),
        });
      } else {
        await trackServer("form_submit_success", { pagePath: referer, handlerKey });
      }

      return response;
    } catch (err) {
      await trackServer("form_submit_error", {
        pagePath: referer,
        handlerKey,
        errorType: err instanceof Error ? err.name : "unknown",
      });
      throw err;
    }
  };
}
