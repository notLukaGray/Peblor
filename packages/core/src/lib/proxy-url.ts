/**
 * Shared proxy URL helpers for server and client. Asset keys are rewritten to
 * same-origin /api/media/... URLs. The API validates the key, generates a fresh
 * signed CDN URL, and returns a 302 redirect — the browser/Three.js fetches the
 * asset directly from Bunny. Vercel serves only the redirect, not the asset bytes.
 * Requires Bunny CDN storage zone to have CORS headers enabled (Access-Control-Allow-Origin: *).
 */

const PROXY_EXTENSIONS = [
  ".exr",
  ".hdr",
  ".glb",
  ".gltf",
  ".mpd",
  ".m3u8",
  ".ts",
  ".m4s",
  ".m4a",
  ".aac",
  ".webm",
  ".mp4",
  ".webp",
  ".jpg",
  ".jpeg",
  ".png",
  ".avif",
];

/** Image extensions: use direct CDN URL (no proxy) so loader can append width/quality/format for Bunny. */
const IMAGE_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png", ".avif"];
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

export function isImageRef(ref: string): boolean {
  if (!ref || typeof ref !== "string") return false;
  const lower = ref.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function needsProxyUrl(ref: string): boolean {
  if (!ref || typeof ref !== "string") return false;
  const lower = ref.toLowerCase();
  return PROXY_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Returns true if the value looks like an asset key that should be rewritten to a proxy URL. */
export function isAssetKey(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/api/media/") ||
    value.startsWith("data:")
  ) {
    return false;
  }
  return needsProxyUrl(value);
}

/** Build same-origin proxy URL for an asset key. The API redirects to a fresh signed CDN URL. */
export function buildProxyUrl(ref: string, params?: Record<string, string>): string {
  const parts = ref.split("/");
  if (
    parts.some(
      (segment) =>
        segment.length === 0 || segment === "." || segment === ".." || !SAFE_SEGMENT.test(segment)
    )
  ) {
    throw new Error(`Invalid proxy asset ref: ${ref}`);
  }
  const path = ref.split("/").map(encodeURIComponent).join("/");
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `/api/media/${path}?${query}` : `/api/media/${path}`;
}
