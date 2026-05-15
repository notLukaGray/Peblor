import { createHash } from "crypto";
import { getCoreGlobals } from "./globals";
import { normalizeImageTransformParams } from "./cdn-image-params";

function getSigningMode(): "private" | "public" {
  const mode = process.env.CDN_SIGNING_MODE;
  if (mode === "public") return "public";
  return "private";
}

function getSecret(): string | undefined {
  return (
    process.env.BUNNY_TOKEN_SECRET ||
    process.env.BUNNY_SECURITY_KEY ||
    process.env.VIDEO_TOKEN_SECRET
  );
}

function requireSecret(): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error(
      "CDN signing is in private mode but no signing secret is configured. " +
        "Set BUNNY_TOKEN_SECRET (or BUNNY_SECURITY_KEY / VIDEO_TOKEN_SECRET) " +
        "or switch to CDN_SIGNING_MODE=public for unsigned URLs."
    );
  }
  return secret;
}

function encodePathPreservingSlashes(path: string): string {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function getSigningPathPrefixFromCdnBase(cdnBase: string): string {
  try {
    const pathname = new URL(cdnBase).pathname.replace(/\/+$/, "");
    return pathname === "/" ? "" : pathname;
  } catch {
    return "";
  }
}

function getDirectoryPath(pathForSigning: string): string {
  const slashIndex = pathForSigning.lastIndexOf("/");
  if (slashIndex === -1) return "/";
  return `${pathForSigning.slice(0, slashIndex + 1)}`;
}

function getCdnOrigin(cdnBase: string): string {
  try {
    return new URL(cdnBase).origin;
  } catch {
    return cdnBase.replace(/\/+$/, "");
  }
}

function getExpiryBucketSeconds(): number {
  const raw = process.env.BUNNY_TOKEN_EXPIRY_BUCKET_SECONDS;
  if (!raw) return 60 * 60;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 60 * 60;
  const rounded = Math.round(parsed);
  if (rounded < 60) return 60;
  if (rounded > 24 * 60 * 60) return 24 * 60 * 60;
  return rounded;
}

export function validateAssetKey(key: string): string | null {
  if (!key || typeof key !== "string") return null;

  // Normalize slashes first
  key = key.replace(/\\/g, "/");

  // Decode percent-encoding (so "%20" etc are validated as the actual characters)
  // If your keys may include literal "%" characters, you will need a different strategy.
  try {
    key = decodeURIComponent(key).trim();
  } catch {
    return null;
  }

  if (!key || key.length > 512) return null;

  // Basic traversal / malformed checks
  if (key.startsWith("/") || key.endsWith("/")) return null;
  if (key.includes("//")) return null;

  const parts = key.split("/");

  // No empty or dot segments
  if (parts.length === 0) return null;
  if (parts.some((p) => p.length === 0 || p === "." || p === "..")) return null;

  // Optional: cap depth to prevent absurd keys
  if (parts.length > 25) return null;

  const filename = parts[parts.length - 1];
  if (!filename || filename.startsWith(".")) return null;

  const { cdnAllowedExtensions } = getCoreGlobals();
  const hasValidExtension = cdnAllowedExtensions.some((ext) =>
    filename.toLowerCase().endsWith(ext.toLowerCase())
  );
  if (!hasValidExtension) return null;

  // Allowed characters per segment
  // Current: letters, numbers, underscore, dash, dot
  // If you need spaces or parentheses, expand this regex.
  const safePart = /^[a-zA-Z0-9_.-]+$/;
  if (!parts.every((p) => safePart.test(p))) return null;

  // Return normalized key with single "/" separators
  return parts.join("/");
}

export function generateBunnyToken(
  signaturePath: string,
  expiresAt: number,
  parameterData: string = ""
): string {
  try {
    const secret = getSigningMode() === "private" ? requireSecret() : getSecret();
    if (!secret) return "";
    const hashableBase = secret + signaturePath + String(expiresAt) + parameterData;
    const hash = createHash("sha256").update(hashableBase).digest("base64");
    return hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  } catch {
    return "";
  }
}

export const CDN_ASSET_CONTENT_TYPES: Record<string, string> = {
  ".exr": "application/exr",
  ".hdr": "application/hdr",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".mpd": "application/dash+xml",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".m4s": "video/iso.segment",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};

export function getContentTypeForAssetKey(assetKey: string): string {
  const ext = assetKey.toLowerCase().slice(assetKey.lastIndexOf("."));
  return CDN_ASSET_CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Build query param string for token hash (Bunny requires all query params except token/expires
 * to be included in the signature, sorted alphabetically, and concatenated raw as `k=v`.
 * Bunny decodes query params before verification, so URL form-encoding here would break hashes.
 */
function buildSortedParamString(params: Record<string, string>): string {
  const entries = Object.entries(params).filter(
    ([k, v]) => k !== "token" && k !== "expires" && v != null && v !== ""
  );
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}=${v}`).join("&");
}

/**
 * Signed CDN URL for an asset. For images, pass extraParams (width, height, quality, format, aspect_ratio) so they are
 * included in the token signature—Bunny rejects requests where query params don't match the hash.
 */
export function getSignedCdnUrl(assetKey: string, extraParams?: Record<string, string>): string {
  const { cdnTokenExpiryDays, cdnBase } = getCoreGlobals();
  const tokenExpirySeconds = cdnTokenExpiryDays * 24 * 60 * 60;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const targetExpiry = nowSeconds + tokenExpirySeconds;
  const bucketSeconds = getExpiryBucketSeconds();
  const expiresAt = Math.ceil(targetExpiry / bucketSeconds) * bucketSeconds;

  const encodedKey = encodePathPreservingSlashes(assetKey);
  const signingPrefix = getSigningPathPrefixFromCdnBase(cdnBase);
  const pathForSigning = `${signingPrefix}/${encodedKey}`;
  const normalizedParams = normalizeImageTransformParams(extraParams);

  const parameterData = normalizedParams ? buildSortedParamString(normalizedParams) : "";
  const token = generateBunnyToken(pathForSigning, expiresAt, parameterData);

  const base = cdnBase.replace(/\/+$/, "");
  if (!base) {
    throw new Error("CDN base URL is not configured.");
  }
  if (!token) {
    if (getSigningMode() === "private") {
      throw new Error(
        "CDN signing is in private mode but token generation failed. " +
          "Ensure BUNNY_TOKEN_SECRET is configured."
      );
    }
    return `${base}/${encodedKey}`;
  }

  if (assetKey.toLowerCase().endsWith(".m3u8") || assetKey.toLowerCase().endsWith(".mpd")) {
    const tokenPath = getDirectoryPath(pathForSigning);
    const hlsParams = { ...(normalizedParams ?? {}), token_path: tokenPath };
    const hlsParameterData = buildSortedParamString(hlsParams);
    const hlsToken = generateBunnyToken(tokenPath, expiresAt, hlsParameterData);
    const tokenPathParam = encodeURIComponent(tokenPath);
    return `${getCdnOrigin(cdnBase)}/bcdn_token=${hlsToken}&expires=${expiresAt}&token_path=${tokenPathParam}${pathForSigning}`;
  }

  const search = new URLSearchParams({ token, expires: String(expiresAt) });
  if (normalizedParams) {
    const sortedKeys = Object.keys(normalizedParams).sort((a, b) => a.localeCompare(b));
    for (const k of sortedKeys) {
      const v = normalizedParams[k];
      if (v != null && v !== "") search.set(k, v);
    }
  }
  return `${base}/${encodedKey}?${search.toString()}`;
}

export async function fetchAssetFromCdn(
  ref: string
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  const maxAttempts = 3;
  const timeoutMs = 10000;
  const assetKey = validateAssetKey(ref);
  if (!assetKey) return null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const url = getSignedCdnUrl(assetKey);
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const res = await fetch(url, { cache: "force-cache", signal });
      if (!res.ok) {
        await res.arrayBuffer().catch(() => undefined);
        if (attempt === maxAttempts) return null;
      } else {
        const MAX_RAW_BYTES = 32 * 1024 * 1024;
        const contentLength = res.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_RAW_BYTES) {
          await res.body?.cancel().catch(() => undefined);
          return null;
        }
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > MAX_RAW_BYTES) return null;
        const contentType = getContentTypeForAssetKey(assetKey);
        return { buffer, contentType };
      }
    } catch {
      if (attempt === maxAttempts) return null;
    }
    await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** (attempt - 1)));
  }
  return null;
}
