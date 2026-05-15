import { NextResponse } from "next/server";
import { readPeblorConfig } from "@pb/core/lib/peblor-config";

/**
 * Dev-only HTTP surfaces (SEC-11). Gated by config or `ENABLE_DEV_API=1` in addition to non-production.
 */
export function isDevApiEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.ENABLE_DEV_API === "1") return true;
  const config = readPeblorConfig();
  return config?.enableDevApi === true;
}

export function devApiDisabledResponse(): NextResponse {
  return new NextResponse("Not found", { status: 404 });
}
