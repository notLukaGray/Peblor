import { NextResponse } from "next/server";

/**
 * Dev-only HTTP surfaces (SEC-11). Gated by `ENABLE_DEV_API=1` in addition to non-production.
 */
export function isDevApiEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.ENABLE_DEV_API === "1") return true;
  return false;
}

export function devApiDisabledResponse(): NextResponse {
  return new NextResponse("Not found", { status: 404 });
}
