import { NextRequest, NextResponse } from "next/server";
import { devApiDisabledResponse, isDevApiEnabled } from "@/core/lib/dev-api-enabled";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isDevApiEnabled()) {
    return devApiDisabledResponse();
  }
  // Consume the request body to avoid lingering stream warnings.
  try {
    await request.text();
  } catch (err) {
    console.warn("[studio] Failed to consume img-telemetry request body", err);
  }
  return NextResponse.json({ ok: true });
}
