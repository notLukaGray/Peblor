import { createReadStream } from "fs";
import fs from "fs/promises";
import { Readable } from "stream";
import { NextRequest } from "next/server";
import { resolveDevMediaPath } from "../resolve-dev-media-path";
import { devApiDisabledResponse, isDevApiEnabled } from "@/core/lib/dev-api-enabled";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

function contentTypeForPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  const match = Object.entries(CONTENT_TYPES).find(([ext]) => lower.endsWith(ext));
  return match?.[1] ?? "application/octet-stream";
}

function parseRange(range: string | null, size: number): { start: number; end: number } | null {
  if (!range) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

export async function GET(request: NextRequest) {
  if (!isDevApiEnabled()) {
    return devApiDisabledResponse();
  }

  const filePathRaw = request.nextUrl.searchParams.get("path");
  if (!filePathRaw) return new Response("Missing path", { status: 400 });
  const filePath = resolveDevMediaPath(filePathRaw);
  if (!filePath) return new Response("Invalid path", { status: 400 });

  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) return new Response("File not found", { status: 404 });

  const contentType = contentTypeForPath(filePath);
  const range = parseRange(request.headers.get("range"), stat.size);
  if (range) {
    const stream = createReadStream(filePath, { start: range.start, end: range.end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(range.end - range.start + 1),
        "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
        "Content-Type": contentType,
      },
    });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(stat.size),
      "Content-Type": contentType,
    },
  });
}
