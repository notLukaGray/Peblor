import { NextResponse } from "next/server";

const DISABLED_MESSAGE = "Magic link auth is temporarily disabled";

export async function POST() {
  return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 501 });
}
