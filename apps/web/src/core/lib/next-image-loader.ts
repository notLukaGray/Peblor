import { cdnBase, imageDefaultQuality, imageDefaultFormat } from "./globals";

type LoaderParams = { src: string; width: number; quality?: number };

/**
 * Next.js custom image loader. All assets are on Bunny CDN: we append
 * width, quality, and format so Bunny Optimizer serves resized images
 * at the edge. Requires Bunny Optimizer with Dynamic Image API enabled.
 * Pre-signed URLs (with width or class) are returned unchanged so the token stays valid.
 * Non-CDN URLs (e.g. proxy) get w/q params so the loader implements width;
 * the server can ignore them.
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
    if (relative.searchParams.has("width") || relative.searchParams.has("class")) {
      return `${src.split("#")[0]}#w=${width}`;
    }

    const url = new URL(cdnBase);
    const origin = `${url.protocol}//${url.hostname}`;
    const isCdn = src.startsWith(origin) || src.includes(url.hostname);
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
