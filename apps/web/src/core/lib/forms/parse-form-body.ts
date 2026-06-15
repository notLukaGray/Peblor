import { NextRequest, NextResponse } from "next/server";

export type FormPayloadValue = string | string[] | boolean | Record<string, unknown>;
export type FormPayload = Record<string, FormPayloadValue>;

/** Max JSON body size (100KB) to mitigate DoS from huge payloads. */
const MAX_BODY_BYTES = 100 * 1024;

function coerceValue(v: unknown): FormPayloadValue {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : String(x)));
  if (v && typeof v === "object") return v as Record<string, unknown>;
  return String(v ?? "");
}

/**
 * Parses POST body as JSON form payload. GET requests should use searchParams in the route.
 * Rejects bodies over MAX_BODY_BYTES when Content-Length is present.
 */
export async function parseFormBody(
  request: NextRequest
): Promise<{ payload: FormPayload } | NextResponse> {
  const rawCt = request.headers.get("content-type");
  if (rawCt) {
    const ct = rawCt.split(";")[0]?.trim().toLowerCase() ?? "";
    const isJson = ct === "application/json" || ct.endsWith("+json");
    if (!isJson) {
      return NextResponse.json({ error: "Unsupported media type." }, { status: 415 });
    }
  }

  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Missing body." }, { status: 400 });
  let received = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch (err) {
    console.warn("[web-core] Failed to parse form body JSON", err);
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const payload: FormPayload = {};
  for (const [k, v] of Object.entries(body)) {
    if (typeof k !== "string" || k.startsWith("_")) continue;
    payload[k] = coerceValue(v);
  }
  return { payload };
}
