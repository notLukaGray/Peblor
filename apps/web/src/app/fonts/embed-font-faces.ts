import { cache } from "react";

const cssCache = new Map<string, string>();

/**
 * Fetches a Bunny Fonts CSS2 response at build time / server start and returns
 * the raw CSS text containing @font-face declarations. The response is cached
 * in memory and reused across all requests so the external CDN is hit only once.
 *
 * By inlining @font-face rules directly into the server-rendered <head>,
 * the browser can discover font file URLs during HTML parse without waiting
 * for a separate stylesheet round-trip. This removes one network waterfall
 * step from the critical rendering path.
 */
export const getBunnyFontCssCached = cache(async (url: string): Promise<string> => {
  const cached = cssCache.get(url);
  if (cached != null) return cached;

  try {
    const res = await fetch(url, {
      headers: {
        // Bunny Fonts may serve different formats per UA; request woff2-capable UA
        "User-Agent": "Mozilla/5.0 (compatible; PeblorBot/1.0)",
      },
      next: {
        // Re-fetch at most once per hour — font file URLs change rarely
        revalidate: 3600,
      },
    });

    if (!res.ok) {
      console.warn(`[embed-font-faces] Failed to fetch webfont CSS (${res.status}): ${url}`);
      return "";
    }

    const css = await res.text();
    cssCache.set(url, css);
    return css;
  } catch (err) {
    console.warn(`[embed-font-faces] Network error fetching webfont CSS: ${url}`, err);
    return "";
  }
});
