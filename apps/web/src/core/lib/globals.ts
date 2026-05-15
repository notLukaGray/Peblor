import personRaw from "@content/site/person.json";
import cdnRaw from "@content/config/cdn.json";
import authRaw from "@content/config/auth.json";
import uiRaw from "@content/config/ui.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeroProject = {
  id: string;
  title: string;
  description?: string;
  slug: string;
  href?: string;
  brand?: { name: string; slug: string };
  video?: { url?: string; poster?: string; duration?: number };
  isHero?: boolean;
  isRestricted?: boolean;
  order?: number;
  [key: string]: unknown;
};

export type PersonSchema = {
  name: string;
  jobTitle: string;
  url: string;
  sameAs: string[];
};

export type TwitterCardType = "summary" | "summary_large_image";

export function getTwitterCardForOgImage(ogImage: unknown): TwitterCardType {
  return typeof ogImage === "string" && ogImage.trim() ? "summary_large_image" : "summary";
}

function getHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Site / person
// ---------------------------------------------------------------------------

export const siteUrl: string =
  typeof (personRaw as { siteUrl?: string }).siteUrl === "string"
    ? (personRaw as { siteUrl: string }).siteUrl
    : "";

export const assetBaseUrl: string =
  typeof (personRaw as { assetBaseUrl?: string }).assetBaseUrl === "string"
    ? (personRaw as { assetBaseUrl: string }).assetBaseUrl
    : "";

const rawPerson = (personRaw as { person?: Record<string, unknown> }).person;
export const person: PersonSchema | null =
  rawPerson &&
  typeof rawPerson.name === "string" &&
  typeof rawPerson.jobTitle === "string" &&
  typeof rawPerson.url === "string" &&
  Array.isArray(rawPerson.sameAs)
    ? {
        name: rawPerson.name,
        jobTitle: rawPerson.jobTitle,
        url: rawPerson.url,
        sameAs: (rawPerson.sameAs as string[]).filter((u): u is string => typeof u === "string"),
      }
    : null;

export const siteMetadata = {
  title: person?.name ?? "Site",
  description: person ? `${person.jobTitle} — ${person.name}` : "Site",
};

/**
 * Pages that render their own nav/footer from peblor JSON; the app Header/Footer is hidden for these.
 * Managed in person.json under `layoutFromJsonSlugs`.
 *
 * Note: an alternative approach would be a `layoutFromJson: boolean` field on individual page definitions,
 * read during page load. That would be self-documenting per-page but requires a pipeline change to plumb
 * the flag through to the layout component.
 */
export const layoutFromJsonSlugs: string[] = (() => {
  const raw_ = personRaw as { layoutFromJsonSlugs?: unknown };
  return Array.isArray(raw_.layoutFromJsonSlugs) &&
    raw_.layoutFromJsonSlugs.every((s): s is string => typeof s === "string")
    ? raw_.layoutFromJsonSlugs
    : [];
})();

// ---------------------------------------------------------------------------
// CDN
// ---------------------------------------------------------------------------

export const cdnBase: string =
  typeof (cdnRaw as { cdnBase?: string }).cdnBase === "string"
    ? (cdnRaw as { cdnBase: string }).cdnBase
    : "";

const cdnConfig = (cdnRaw as { cdn?: Record<string, unknown> }).cdn;
export const cdnTokenExpiryDays: number =
  typeof cdnConfig?.tokenExpiryDays === "number" ? cdnConfig.tokenExpiryDays : 7;
export const cdnClientCacheExpiryHours: number =
  typeof cdnConfig?.clientCacheExpiryHours === "number" ? cdnConfig.clientCacheExpiryHours : 1;
export const cdnApiCacheMaxAge: number =
  typeof cdnConfig?.apiCacheMaxAge === "number" ? cdnConfig.apiCacheMaxAge : 3600;
export const cdnApiCacheStaleWhileRevalidate: number =
  typeof cdnConfig?.apiCacheStaleWhileRevalidate === "number"
    ? cdnConfig.apiCacheStaleWhileRevalidate
    : 300;
const cdnBaseHost = getHostname(cdnBase);
const cdnAllowedHostAliases =
  Array.isArray(cdnConfig?.allowedHosts) &&
  cdnConfig.allowedHosts.every((host: unknown) => typeof host === "string")
    ? (cdnConfig.allowedHosts as string[])
    : [];
export const cdnAllowedHosts: string[] = [
  ...new Set([...(cdnBaseHost ? [cdnBaseHost] : []), ...cdnAllowedHostAliases]),
];
export const cdnAllowedExtensions: string[] =
  Array.isArray(cdnConfig?.allowedExtensions) &&
  cdnConfig.allowedExtensions.every((ext: unknown) => typeof ext === "string")
    ? (cdnConfig.allowedExtensions as string[])
    : [
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
        ".glb",
        ".gltf",
        ".exr",
        ".hdr",
      ];

const cdnImagesConfig = (cdnConfig as { images?: Record<string, unknown> } | undefined)?.images;
export const imageDefaultWidth: number =
  typeof cdnImagesConfig?.defaultWidth === "number" ? cdnImagesConfig.defaultWidth : 1200;
export const imageDefaultPosterWidth: number =
  typeof cdnImagesConfig?.defaultPosterWidth === "number"
    ? cdnImagesConfig.defaultPosterWidth
    : 1920;
/** Web-optimized poster width for LCP (hero/background posters). When set in cdn.json, used instead of defaultPosterWidth. */
export const imagePosterWidth: number =
  typeof cdnImagesConfig?.posterWidth === "number"
    ? cdnImagesConfig.posterWidth
    : imageDefaultPosterWidth;
export const imageMobileMaxWidth: number =
  typeof cdnImagesConfig?.mobileMaxWidth === "number" ? cdnImagesConfig.mobileMaxWidth : 768;
export const imageMobileMaxWidth2x: number =
  typeof cdnImagesConfig?.mobileMaxWidth2x === "number" ? cdnImagesConfig.mobileMaxWidth2x : 1536;
export const imageDefaultQuality: number =
  typeof cdnImagesConfig?.defaultQuality === "number" ? cdnImagesConfig.defaultQuality : 75;
/** Web-optimized poster quality for LCP. When set in cdn.json, used for hero/background posters. */
export const imagePosterQuality: number =
  typeof cdnImagesConfig?.posterQuality === "number"
    ? cdnImagesConfig.posterQuality
    : imageDefaultQuality;
export const imageDefaultFormat: string =
  typeof cdnImagesConfig?.defaultFormat === "string" ? cdnImagesConfig.defaultFormat : "webp";
export const imageDefaultAspectRatio: string | null =
  cdnImagesConfig?.defaultAspectRatio != null &&
  typeof cdnImagesConfig.defaultAspectRatio === "string"
    ? cdnImagesConfig.defaultAspectRatio
    : null;
export const imagePosterAspectRatio: string | null =
  cdnImagesConfig?.posterAspectRatio != null &&
  typeof cdnImagesConfig.posterAspectRatio === "string"
    ? cdnImagesConfig.posterAspectRatio
    : null;
export const imageClass: string | null =
  cdnImagesConfig?.class != null && typeof cdnImagesConfig.class === "string"
    ? cdnImagesConfig.class
    : null;
export const imagePosterClass: string | null =
  cdnImagesConfig?.posterClass != null && typeof cdnImagesConfig.posterClass === "string"
    ? cdnImagesConfig.posterClass
    : null;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const authConfig = (authRaw as { auth?: Record<string, unknown> }).auth;
const accessCookieConfig = authConfig?.accessCookie as Record<string, unknown> | undefined;
export const accessCookieName: string =
  typeof accessCookieConfig?.name === "string" ? accessCookieConfig.name : "site_access";
export const accessCookieMaxAgeDays: number =
  typeof accessCookieConfig?.maxAgeDays === "number" ? accessCookieConfig.maxAgeDays : 7;

const rateLimitConfig = authConfig?.rateLimit as Record<string, unknown> | undefined;
export const rateLimitCookieName: string =
  typeof rateLimitConfig?.cookieName === "string" ? rateLimitConfig.cookieName : "unlock_rate";
export const rateLimitMaxAttempts: number =
  typeof rateLimitConfig?.maxAttempts === "number" ? rateLimitConfig.maxAttempts : 5;
export const rateLimitLockoutMinutes: number =
  typeof rateLimitConfig?.lockoutMinutes === "number" ? rateLimitConfig.lockoutMinutes : 10;
export const rateLimitCookieExpiryHours: number =
  typeof rateLimitConfig?.cookieExpiryHours === "number" ? rateLimitConfig.cookieExpiryHours : 1;

const formRateLimitConfig = authConfig?.formRateLimit as Record<string, unknown> | undefined;
export const formRateLimitMaxPerHour: number =
  typeof formRateLimitConfig?.maxPerHour === "number" ? formRateLimitConfig.maxPerHour : 5;

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const uiConfig = (uiRaw as { ui?: Record<string, unknown> }).ui;
export const uiResizeDebounceMs: number =
  typeof uiConfig?.resizeDebounceMs === "number" ? uiConfig.resizeDebounceMs : 50;
export const uiVideoPauseButtonHideDelayMs: number =
  typeof uiConfig?.videoPauseButtonHideDelayMs === "number"
    ? uiConfig.videoPauseButtonHideDelayMs
    : 3000;

const uiHomeConfig = uiConfig?.home as Record<string, unknown> | undefined;
const uiHeroCarouselConfig = uiHomeConfig?.heroCarousel as Record<string, unknown> | undefined;
export const uiHeroCarouselOpacityCurve: number[] =
  Array.isArray(uiHeroCarouselConfig?.opacityCurve) &&
  uiHeroCarouselConfig.opacityCurve.length > 0 &&
  uiHeroCarouselConfig.opacityCurve.every((value: unknown) => typeof value === "number")
    ? (uiHeroCarouselConfig.opacityCurve as number[])
    : [0];
export const uiHeroCarouselPlaceholderBackgrounds: string[] =
  Array.isArray(uiHeroCarouselConfig?.placeholderBackgrounds) &&
  uiHeroCarouselConfig.placeholderBackgrounds.length > 0 &&
  uiHeroCarouselConfig.placeholderBackgrounds.every((value: unknown) => typeof value === "string")
    ? (uiHeroCarouselConfig.placeholderBackgrounds as string[])
    : ["#000000"];

const uiVideoConfig = uiConfig?.video as Record<string, unknown> | undefined;
export const uiVideoDoubleTapThresholdMs: number =
  typeof uiVideoConfig?.doubleTapThresholdMs === "number"
    ? uiVideoConfig.doubleTapThresholdMs
    : 450;
export const uiVideoHoldThresholdMs: number =
  typeof uiVideoConfig?.holdThresholdMs === "number" ? uiVideoConfig.holdThresholdMs : 400;
export const uiVideoHoldRepeatMs: number =
  typeof uiVideoConfig?.holdRepeatMs === "number" ? uiVideoConfig.holdRepeatMs : 500;
export const uiVideoFeedbackDurationMs: number =
  typeof uiVideoConfig?.feedbackDurationMs === "number" ? uiVideoConfig.feedbackDurationMs : 500;
export const uiVideoSeekBackSeconds: number =
  typeof uiVideoConfig?.seekBackSeconds === "number" ? uiVideoConfig.seekBackSeconds : 10;
export const uiVideoSeekForwardSeconds: number =
  typeof uiVideoConfig?.seekForwardSeconds === "number" ? uiVideoConfig.seekForwardSeconds : 30;
export const uiVideoDefaultAspectRatio: string =
  typeof uiVideoConfig?.defaultAspectRatio === "string" ? uiVideoConfig.defaultAspectRatio : "16/9";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cacheConfig = (uiRaw as { cache?: Record<string, unknown> }).cache;
export const cacheVideoUrlPrefix: string =
  typeof cacheConfig?.videoUrlPrefix === "string" ? cacheConfig.videoUrlPrefix : "video_url_";
