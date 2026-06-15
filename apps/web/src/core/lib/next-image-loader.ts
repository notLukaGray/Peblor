import { cdnBase, imageDefaultQuality, imageDefaultFormat } from "./globals";

type LoaderParams = { src: string; width: number; quality?: number };

/**
 * Next.js custom image loader. All assets are on Bunny CDN: we append
 * width, quality, and format so Bunny Optimizer serves resized images
 * at the edge. Requires Bunny Optimizer with Dynamic Image API enabled.
 * Immutable pre-sized/class-based URLs are returned unchanged so the loader
 * does not invalidate tokens or class transforms. Same-origin `/api/media/...`
 * aliases with a width param are re-written per requested width so Next.js can
 * emit responsive srcsets against the stable alias path.
 */
const BUNNY_PARAMS = ["width", "quality", "format", "aspect_ratio", "class", "w", "q"];

function stripBunnyParams(url: URL): void {
  for (const p of BUNNY_PARAMS) url.searchParams.delete(p);
}

export default function bunnyImageLoader({
  src,
  width,
  quality = imageDefaultQuality,
}: LoaderParams): string {
  if (!src || typeof src !== "string") return src;
  try {
    const relative = new URL(src, "http://local");
    const isProxyMedia =
      relative.origin === "http://local" && relative.pathname.startsWith("/api/media/");
    if (
      (!isProxyMedia &&
        (relative.searchParams.has("width") || relative.searchParams.has("class"))) ||
      (isProxyMedia && relative.searchParams.has("class"))
    ) {
      return `${src.split("#")[0]}#w=${width}`;
    }

    const cdnUrl = new URL(cdnBase);
    let isCdn = false;
    try {
      const srcUrl = new URL(src);
      isCdn = srcUrl.hostname === cdnUrl.hostname;
    } catch {
      isCdn = false;
    }
    if (isCdn) {
      const parsed = new URL(src);
      // Pre-signed URL: width or class is part of the token; don't change query or the token breaks.
      // Append a fragment that varies by width so Next.js sees the loader "implements" width;
      // the fragment is not sent to the server, so the same signed URL is requested.
      if (parsed.searchParams.has("width") || parsed.searchParams.has("class")) {
        return `${src.split("#")[0]}#w=${width}`;
      }
      stripBunnyParams(parsed);
      parsed.searchParams.set("width", String(Math.round(width)));
      parsed.searchParams.set("quality", String(quality));
      parsed.searchParams.set("format", imageDefaultFormat);
      return parsed.toString();
    }
  } catch {
    // fall through to width-only append
  }
  // Satisfy Next.js loader contract while preserving same-origin proxy URLs.
  try {
    const url = new URL(src, "http://local");
    stripBunnyParams(url);
    url.searchParams.set("width", String(Math.round(width)));
    url.searchParams.set("quality", String(quality));
    url.searchParams.set("format", imageDefaultFormat);
    return src.startsWith("http://") || src.startsWith("https://")
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}width=${Math.round(width)}&quality=${quality}&format=${imageDefaultFormat}`;
  }
}
