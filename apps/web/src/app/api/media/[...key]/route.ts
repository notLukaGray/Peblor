import { NextRequest, NextResponse } from "next/server";
import {
  fetchAssetFromCdn,
  validateAssetKey,
  getSignedCdnUrl,
} from "@pb/core/lib/cdn-asset-server";
import { buildProxyUrl } from "@/core/lib/proxy-url";
import { normalizeImageTransformParams } from "@pb/core/lib/cdn-image-params";

const hlsCache = new Map<string, { data: string; expiresAt: number }>();
const HLS_CACHE_TTL = 60_000;

function isAbsoluteUrl(uri: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(uri) || uri.startsWith("//");
}

function parseImageParams(request: NextRequest): Record<string, string> | undefined {
  const searchParams = request.nextUrl.searchParams;
  const input: Record<string, string> = {};
  for (const key of ["width", "w", "quality", "q", "height", "format", "aspect_ratio", "class"]) {
    const value = searchParams.get(key);
    if (value != null) input[key] = value;
  }
  return normalizeImageTransformParams(Object.keys(input).length > 0 ? input : undefined);
}

function isHlsPlaylist(assetKey: string): boolean {
  return assetKey.toLowerCase().endsWith(".m3u8");
}

function isTransformableImage(assetKey: string): boolean {
  return /\.(?:avif|jpe?g|png|webp)$/i.test(assetKey);
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

function rewriteHlsUri(line: string, baseKey: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return line;

  // In private CDN mode, reject absolute/protocol-relative URIs that don't match the CDN host.
  if (isAbsoluteUrl(trimmed)) {
    if (process.env.CDN_SIGNING_MODE !== "public") {
      // Reject playlist in private mode when absolute media URIs are present.
      return null;
    }
    return line;
  }

  if (trimmed.startsWith("#")) {
    return line.replace(/URI=("([^"]+)"|'([^']+)'|([^\s,>]+))/g, (_match, _full, dq, sq, uq) => {
      const uri = dq ?? sq ?? uq ?? "";
      const quote = _full.startsWith('"') ? '"' : _full.startsWith("'") ? "'" : "";
      if (isAbsoluteUrl(uri)) {
        if (process.env.CDN_SIGNING_MODE !== "public") {
          throw new Error("unsafe-absolute-tag-uri");
        }
        return `URI=${quote}${uri}${quote}`;
      }
      if (uri.startsWith("/")) return `URI=${quote}${uri}${quote}`;

      const { pathPart, suffix } = splitUriSuffix(uri);
      const normalized = [baseKey, pathPart]
        .filter(Boolean)
        .join("/")
        .replace(/\/+/g, "/")
        .split("/")
        .reduce<string[]>((parts, part) => {
          if (part === ".") return parts;
          if (part === "..") {
            parts.pop();
            return parts;
          }
          parts.push(part);
          return parts;
        }, [])
        .join("/");
      const assetKey = validateAssetKey(normalized);
      return assetKey
        ? `URI=${quote}${buildProxyUrl(assetKey)}${suffix}${quote}`
        : `URI=${quote}${uri}${quote}`;
    });
  }

  const { pathPart, suffix } = splitUriSuffix(trimmed);
  const normalized = [baseKey, pathPart]
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/")
    .split("/")
    .reduce<string[]>((parts, part) => {
      if (part === ".") return parts;
      if (part === "..") {
        parts.pop();
        return parts;
      }
      parts.push(part);
      return parts;
    }, [])
    .join("/");
  const assetKey = validateAssetKey(normalized);
  if (!assetKey) return line;

  return line.replace(trimmed, `${buildProxyUrl(assetKey)}${suffix}`);
}

function rewriteHlsPlaylist(playlist: string, assetKey: string): string | null {
  const slashIndex = assetKey.lastIndexOf("/");
  const baseKey = slashIndex === -1 ? "" : assetKey.slice(0, slashIndex);
  try {
    const rewritten = playlist.split(/\r?\n/).map((line) => rewriteHlsUri(line, baseKey));
    if (rewritten.some((line) => line === null)) return null;
    return rewritten.join("\n");
  } catch {
    return null;
  }
}

function buildRedirectResponse(cdnUrl: string): NextResponse {
  const response = NextResponse.redirect(cdnUrl, 302);
  response.headers.set(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
  );
  response.headers.set("X-Image-Delivery-Route", "api_media_proxy");
  return response;
}

async function buildRawAssetResponse(assetKey: string): Promise<NextResponse> {
  const asset = await fetchAssetFromCdn(assetKey);
  if (!asset) return NextResponse.json({ error: "Unable to fetch asset." }, { status: 502 });

  return new NextResponse(asset.buffer, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": asset.contentType,
      "X-Image-Delivery-Route": "api_media_raw",
    },
  });
}

/**
 * GET /api/media/[...key] – validate asset key and redirect to a fresh signed CDN URL.
 * Key can be a single segment (e.g. video.webm) or path/filename (e.g. dump_3d_test/albedo_card.webp).
 * Catch-all ensures path keys are not split when the server decodes %2F to /.
 */
function isRawAllowedFormat(assetKey: string): boolean {
  return /\.(?:avif|jpe?g|png|webp)$/i.test(assetKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
): Promise<NextResponse> {
  try {
    let keySegments: string[];
    try {
      const resolvedParams = await params;
      keySegments = resolvedParams.key;
    } catch (_error) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
    }

    if (!Array.isArray(keySegments) || keySegments.length === 0) {
      return NextResponse.json({ error: "Missing asset key" }, { status: 400 });
    }

    const key = keySegments.join("/");

    const assetKey = validateAssetKey(key);
    if (!assetKey) {
      return NextResponse.json(
        {
          error:
            "Invalid asset key. Use filename.ext or path/filename.ext (e.g. project/asset.webp).",
        },
        { status: 400 }
      );
    }

    if (request.nextUrl.searchParams.get("raw") === "1") {
      if (!isRawAllowedFormat(assetKey)) {
        return NextResponse.json(
          { error: "raw=1 is restricted to image formats (jpg, png, webp, avif, hdr, exr)." },
          { status: 400 }
        );
      }
      return buildRawAssetResponse(assetKey);
    }

    const cdnUrl = getSignedCdnUrl(
      assetKey,
      isTransformableImage(assetKey) ? parseImageParams(request) : undefined
    );

    if (isHlsPlaylist(assetKey)) {
      const cached = hlsCache.get(assetKey);
      if (cached && Date.now() < cached.expiresAt) {
        const playlist = rewriteHlsPlaylist(cached.data, assetKey);
        if (playlist == null) {
          return NextResponse.json(
            { error: "Rejected HLS playlist containing absolute URIs in private mode." },
            { status: 502 }
          );
        }
        return new NextResponse(playlist, {
          headers: {
            "Cache-Control": "private, max-age=60",
            "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
          },
        });
      }

      const upstream = await fetch(cdnUrl);
      if (!upstream.ok) {
        return NextResponse.json(
          { error: `Unable to fetch HLS playlist (${upstream.status}).` },
          { status: upstream.status }
        );
      }

      const text = await upstream.text();
      hlsCache.set(assetKey, { data: text, expiresAt: Date.now() + HLS_CACHE_TTL });

      const playlist = rewriteHlsPlaylist(text, assetKey);
      if (playlist == null) {
        return NextResponse.json(
          { error: "Rejected HLS playlist containing absolute URIs in private mode." },
          { status: 502 }
        );
      }
      return new NextResponse(playlist, {
        headers: {
          "Cache-Control": "private, max-age=60",
          "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
        },
      });
    }

    // Redirect all asset types to the signed CDN URL — browser/Three.js fetches
    // directly from Bunny. Vercel serves only this tiny redirect, not the asset bytes.
    return buildRedirectResponse(cdnUrl);
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
