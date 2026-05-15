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

export type RuntimeGlobals = {
  siteUrl: string;
  assetBaseUrl: string;
  person: PersonSchema | null;
  siteMetadata: { title: string; description: string };
  layoutFromJsonSlugs: string[];
  cdnBase: string;
  cdnTokenExpiryDays: number;
  cdnClientCacheExpiryHours: number;
  cdnApiCacheMaxAge: number;
  cdnApiCacheStaleWhileRevalidate: number;
  cdnAllowedHosts: string[];
  cdnAllowedExtensions: string[];
  imageDefaultWidth: number;
  imageDefaultPosterWidth: number;
  imagePosterWidth: number;
  imageMobileMaxWidth: number;
  imageMobileMaxWidth2x: number;
  imageDefaultQuality: number;
  imagePosterQuality: number;
  imageDefaultFormat: string;
  imageDefaultAspectRatio: string | null;
  imagePosterAspectRatio: string | null;
  imageClass: string | null;
  imagePosterClass: string | null;
  accessCookieName: string;
  accessCookieMaxAgeDays: number;
  rateLimitCookieName: string;
  rateLimitMaxAttempts: number;
  rateLimitLockoutMinutes: number;
  rateLimitCookieExpiryHours: number;
  formRateLimitMaxPerHour: number;
  uiResizeDebounceMs: number;
  uiVideoPauseButtonHideDelayMs: number;
  uiHeroCarouselOpacityCurve: number[];
  uiHeroCarouselPlaceholderBackgrounds: string[];
  uiVideoDoubleTapThresholdMs: number;
  uiVideoHoldThresholdMs: number;
  uiVideoHoldRepeatMs: number;
  uiVideoFeedbackDurationMs: number;
  uiVideoSeekBackSeconds: number;
  uiVideoSeekForwardSeconds: number;
  uiVideoDefaultAspectRatio: string;
  cacheVideoUrlPrefix: string;
};

const DEFAULTS: RuntimeGlobals = {
  siteUrl: "",
  assetBaseUrl: "",
  person: null,
  siteMetadata: { title: "Site", description: "Site" },
  layoutFromJsonSlugs: [],
  cdnBase: "",
  cdnTokenExpiryDays: 7,
  cdnClientCacheExpiryHours: 1,
  cdnApiCacheMaxAge: 3600,
  cdnApiCacheStaleWhileRevalidate: 300,
  cdnAllowedHosts: [],
  cdnAllowedExtensions: [
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
  ],
  imageDefaultWidth: 1200,
  imageDefaultPosterWidth: 1920,
  imagePosterWidth: 1280,
  imageMobileMaxWidth: 768,
  imageMobileMaxWidth2x: 1536,
  imageDefaultQuality: 75,
  imagePosterQuality: 75,
  imageDefaultFormat: "webp",
  imageDefaultAspectRatio: null,
  imagePosterAspectRatio: null,
  imageClass: null,
  imagePosterClass: null,
  accessCookieName: "site_access",
  accessCookieMaxAgeDays: 7,
  rateLimitCookieName: "unlock_rate",
  rateLimitMaxAttempts: 5,
  rateLimitLockoutMinutes: 10,
  rateLimitCookieExpiryHours: 1,
  formRateLimitMaxPerHour: 5,
  uiResizeDebounceMs: 50,
  uiVideoPauseButtonHideDelayMs: 3000,
  uiHeroCarouselOpacityCurve: [0],
  uiHeroCarouselPlaceholderBackgrounds: ["#000000"],
  uiVideoDoubleTapThresholdMs: 450,
  uiVideoHoldThresholdMs: 400,
  uiVideoHoldRepeatMs: 500,
  uiVideoFeedbackDurationMs: 500,
  uiVideoSeekBackSeconds: 10,
  uiVideoSeekForwardSeconds: 30,
  uiVideoDefaultAspectRatio: "16/9",
  cacheVideoUrlPrefix: "video_url_",
};

const _state: RuntimeGlobals = { ...DEFAULTS };

export const globals: RuntimeGlobals = new Proxy(_state, {
  get(target, prop: string | symbol) {
    return target[prop as keyof RuntimeGlobals];
  },
  set() {
    return true;
  },
});

export function configureRuntimeGlobals(patch: Partial<RuntimeGlobals>): void {
  Object.assign(_state, patch);
  if (patch.cdnAllowedExtensions) _state.cdnAllowedExtensions = [...patch.cdnAllowedExtensions];
  if (patch.cdnAllowedHosts) _state.cdnAllowedHosts = [...patch.cdnAllowedHosts];
  if (patch.layoutFromJsonSlugs) _state.layoutFromJsonSlugs = [...patch.layoutFromJsonSlugs];
  if (patch.uiHeroCarouselOpacityCurve)
    _state.uiHeroCarouselOpacityCurve = [...patch.uiHeroCarouselOpacityCurve];
  if (patch.uiHeroCarouselPlaceholderBackgrounds)
    _state.uiHeroCarouselPlaceholderBackgrounds = [...patch.uiHeroCarouselPlaceholderBackgrounds];
}

export function resetRuntimeGlobals(): void {
  Object.assign(_state, DEFAULTS);
}
