export const browserDataCookieName = "pb_browser_data";

const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type BrowserDataCookie = {
  viewportWidthPx?: number;
  viewportHeightPx?: number;
  devicePixelRatio?: number;
  updatedAtMs?: number;
};

const MAX_COOKIE_AGE_SECONDS = 60 * 60 * 24 * 30;

function clampInt(value: unknown, min: number, max: number): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return undefined;
  return rounded;
}

function clampFloat(value: unknown, min: number, max: number): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (n < min || n > max) return undefined;
  return Math.round(n * 100) / 100;
}

export function normalizeBrowserDataCookie(value: BrowserDataCookie): BrowserDataCookie {
  const viewportWidthPx = clampInt(value.viewportWidthPx, 0, 20000);
  const viewportHeightPx = clampInt(value.viewportHeightPx, 0, 20000);
  const devicePixelRatio = clampFloat(value.devicePixelRatio, 0.1, 10);
  const updatedAtMs = clampInt(value.updatedAtMs, 0, 9999999999999);
  return {
    ...(viewportWidthPx != null ? { viewportWidthPx } : {}),
    ...(viewportHeightPx != null ? { viewportHeightPx } : {}),
    ...(devicePixelRatio != null ? { devicePixelRatio } : {}),
    ...(updatedAtMs != null ? { updatedAtMs } : {}),
  };
}

export function serializeBrowserDataCookie(value: BrowserDataCookie): string {
  const normalized = normalizeBrowserDataCookie(value);
  const encoded = encodeURIComponent(JSON.stringify(normalized));
  return `${browserDataCookieName}=${encoded}; Path=/; Max-Age=${MAX_COOKIE_AGE_SECONDS}; SameSite=Lax`;
}

export function parseBrowserDataCookie(raw: string | undefined): BrowserDataCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as BrowserDataCookie;
    return normalizeBrowserDataCookie(parsed);
  } catch (err) {
    console.warn("[web-core] Failed to parse browser data cookie", err);
    return null;
  }
}

/**
 * Returns the cookie's viewport width if the cookie is fresh (< 24h old), otherwise undefined.
 * Stale data (e.g. a laptop's last-known width surfacing on a phone) would misreport the breakpoint.
 */
export function canonicalViewportWidthFromCookie(
  browserData: BrowserDataCookie | null
): number | undefined {
  const isFresh =
    browserData?.updatedAtMs != null &&
    browserData.updatedAtMs > 0 &&
    Date.now() - browserData.updatedAtMs < COOKIE_MAX_AGE_MS;
  return isFresh && browserData?.viewportWidthPx != null && browserData.viewportWidthPx > 0
    ? browserData.viewportWidthPx
    : undefined;
}
