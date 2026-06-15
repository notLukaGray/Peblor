/**
 * Canonical list of allowed CDN asset extensions.
 *
 * The app/web globals file spreads this constant instead of hardcoding a
 * duplicate fallback array. When the CDN config supplies its own
 * `allowedExtensions`, that list is used instead.
 */
export const CDN_ALLOWED_EXTENSIONS: string[] = [
  ".webm",
  ".mp4",
  ".mpd",
  ".m3u8",
  ".ts",
  ".m4s",
  ".m4a",
  ".aac",
  ".webp",
  ".jpg",
  ".jpeg",
  ".png",
  ".avif",
  ".glb",
  ".gltf",
  ".exr",
  ".hdr",
];

/** Recognised image extensions for proxy URL rewriting. */
export const IMAGE_EXTENSIONS: string[] = [".webp", ".jpg", ".jpeg", ".png", ".avif"];

/** Safe segment pattern for URL path validation. */
export const SAFE_SEGMENT_REGEX = /^[A-Za-z0-9._-]+$/;
