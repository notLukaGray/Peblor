import { globals } from "./globals";

function getHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function hostMatchesSuffix(hostname: string, suffix: string): boolean {
  const normalized = suffix.startsWith(".") ? suffix.slice(1) : suffix;
  return hostname === normalized || hostname.endsWith(`.${normalized}`);
}

/**
 * Mirrors the production CSP allow-list (apps/web/src/core/lib/csp.ts) so the
 * runtime can recognize a third-party asset URL and fail gracefully instead of
 * letting the browser's CSP block surface as an uncaught fetch/load error.
 */
export function isApprovedAssetUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return true;
  if (!/^https?:\/\//i.test(trimmed)) return true;

  const hostname = getHostname(trimmed);
  if (!hostname) return false;

  if (typeof window !== "undefined" && hostname === window.location.hostname) return true;

  const cdnHostname = globals.cdnBase ? getHostname(globals.cdnBase) : "";
  if (cdnHostname && hostname === cdnHostname) return true;

  return globals.cdnAllowedHosts.some((suffix) => hostMatchesSuffix(hostname, suffix));
}

export const THIRD_PARTY_ASSET_MESSAGE = "Third-party asset — please host on an approved CDN.";
