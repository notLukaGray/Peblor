import { NextResponse } from "next/server";

const DISABLED_MESSAGE = "Password reset via token link is not implemented";

export async function POST() {
  // Local password unlock is supported; token-based unlock links are not wired yet.
  return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 501 });
}
