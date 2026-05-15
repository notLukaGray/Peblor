import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextRequest } from "next/server";
import { resolveDevMediaPath } from "../resolve-dev-media-path";
import { devApiDisabledResponse, isDevApiEnabled } from "@/core/lib/dev-api-enabled";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".mpd": "application/dash+xml",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".m4s": "video/iso.segment",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
};

function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

function normalizePlaylistPath(value: string): string | null {
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (normalized.startsWith("../") || normalized === ".." || path.posix.isAbsolute(normalized)) {
    return null;
  }
  return normalized;
}

function resolvePreviewFile(outputDir: string, file: string): string | null {
  const normalizedFile = normalizePlaylistPath(file);
  if (!normalizedFile) return null;

  const resolved = path.resolve(outputDir, normalizedFile);
  const relative = path.relative(outputDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
}

function splitUriSuffix(uri: string): { pathPart: string; suffix: string } {
  const queryIndex = uri.indexOf("?");
  const hashIndex = uri.indexOf("#");
  const suffixIndex =
    queryIndex === -1 ? hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);

  if (suffixIndex === -1) return { pathPart: uri, suffix: "" };
  return {
    pathPart: uri.slice(0, suffixIndex),
    suffix: uri.slice(suffixIndex),
  };
}

function rewritePlaylistUri(uri: string, outputDir: string, currentFile: string): string {
  if (!uri || uri.startsWith("/") || uri.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(uri)) {
    return uri;
  }

  const { pathPart } = splitUriSuffix(uri);
  const currentFolder = path.posix.dirname(currentFile);
  const nextFile = path.posix.normalize(path.posix.join(currentFolder, pathPart));
  const params = new URLSearchParams({ dir: outputDir, file: nextFile });
  return `/api/dev/local-hls-preview?${params.toString()}`;
}

function rewritePlaylistLine(line: string, outputDir: string, currentFile: string): string {
  const trimmed = line.trim();
  if (!trimmed) return line;
  if (trimmed.startsWith("#")) {
    return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
      return `URI="${rewritePlaylistUri(uri, outputDir, currentFile)}"`;
    });
  }
  return rewritePlaylistUri(trimmed, outputDir, currentFile);
}

async function playlistResponse(filePath: string, outputDir: string, file: string) {
  const playlist = await fs.readFile(filePath, "utf8");
  const rewritten = playlist
    .split(/\r?\n/)
    .map((line) => rewritePlaylistLine(line, outputDir, file))
    .join("\n");

  return new Response(rewritten, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
    },
  });
}

function streamResponse(filePath: string, size: number) {
  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Length": String(size),
      "Content-Type": contentTypeForPath(filePath),
    },
  });
}

export async function GET(request: NextRequest) {
  if (!isDevApiEnabled()) {
    return devApiDisabledResponse();
  }

  const outputDirRaw = request.nextUrl.searchParams.get("dir")?.trim();
  const fileRaw = request.nextUrl.searchParams.get("file")?.trim() || "master.m3u8";
  if (!outputDirRaw) return new Response("Missing output folder", { status: 400 });

  const outputDir = resolveDevMediaPath(outputDirRaw);
  if (!outputDir) return new Response("Invalid output folder", { status: 400 });
  const filePath = resolvePreviewFile(outputDir, fileRaw);
  if (!filePath) return new Response("Invalid preview path", { status: 400 });

  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) return new Response("File not found", { status: 404 });

  if (filePath.toLowerCase().endsWith(".m3u8")) {
    return playlistResponse(filePath, outputDir, fileRaw);
  }

  return streamResponse(filePath, stat.size);
}
