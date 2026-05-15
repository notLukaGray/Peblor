import { NextRequest, NextResponse } from "next/server";
import { runPeblorValidation, summarizeValidation } from "@pb/runtime-react/dev-server";
import { devApiDisabledResponse, isDevApiEnabled } from "@/core/lib/dev-api-enabled";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isDevApiEnabled()) {
    return devApiDisabledResponse();
  }

  const slug = request.nextUrl.searchParams.get("slug");
  const results = await runPeblorValidation(slug ? { slugs: [slug] } : {});
  const summary = summarizeValidation(results);

  return NextResponse.json({
    results,
    summary,
  });
}
