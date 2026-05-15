import {
  cdnAllowedHosts,
  uiHeroCarouselOpacityCurve,
  uiHeroCarouselPlaceholderBackgrounds,
  type HeroProject,
} from "@/core/lib/globals";
import { buildProxyUrl, needsProxyUrl } from "@/core/lib/proxy-url";

/** Wrap index into [0, length). */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (index < 0) {
    return ((index % length) + length) % length;
  }
  if (index >= length) {
    return index % length;
  }
  return index;
}

/** Opacity for carousel position 0-6 (center=3). */
export function getHeroCarouselOpacity(position: number): number {
  return uiHeroCarouselOpacityCurve[position] ?? 0;
}

export function getProjectUrl(project: HeroProject): string {
  if (typeof project.href === "string" && project.href.trim()) return project.href;
  const slug = project.slug.replace(/^\/+/, "");
  return `/${slug}`;
}

/** Background color for carousel placeholder. */
export function getCarouselPlaceholderBg(activeIndex: number): string {
  return (
    uiHeroCarouselPlaceholderBackgrounds[
      wrapIndex(activeIndex, uiHeroCarouselPlaceholderBackgrounds.length)
    ] ?? "#000000"
  );
}

function normalizeAssetKeyCandidate(value: string): string {
  const raw = value.trim();
  const hashIdx = raw.indexOf("#");
  const queryIdx = raw.indexOf("?");
  const endIdx =
    hashIdx >= 0 && (queryIdx === -1 || hashIdx < queryIdx)
      ? hashIdx
      : queryIdx >= 0
        ? queryIdx
        : raw.length;
  return raw.slice(0, endIdx).replace(/^\/+/, "");
}

function buildProxyUrlForCandidate(value: string): string | null {
  const key = normalizeAssetKeyCandidate(value);
  if (!key || !needsProxyUrl(key)) return null;
  return buildProxyUrl(key);
}

function extractAssetKeyFromAllowedCdnUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isAllowedHost = cdnAllowedHosts.some((allowedHost) => {
      const normalized = allowedHost.toLowerCase();
      return normalized.startsWith(".") ? host.endsWith(normalized) : host === normalized;
    });
    if (!isAllowedHost) return null;

    let key = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
    if (key.startsWith("website/")) {
      key = key.slice("website/".length);
    }
    return needsProxyUrl(key) ? key : null;
  } catch {
    return null;
  }
}

/**
 * Enforce token-safe homepage media URLs:
 * - asset keys and legacy CDN URLs are rewritten to same-origin /api/media/... proxy URLs
 * - unknown absolute URLs are dropped to avoid unsigned direct CDN usage
 */
export function resolveHomeMediaUrl(raw: string | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  if (value.startsWith("/api/media/") || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    const cdnKey = extractAssetKeyFromAllowedCdnUrl(value);
    return cdnKey ? buildProxyUrl(cdnKey) : undefined;
  }

  const proxyFromAsset = buildProxyUrlForCandidate(value);
  if (proxyFromAsset) return proxyFromAsset;

  return undefined;
}
