import { CDN_ALLOWED_EXTENSIONS } from "@pb/core/lib/asset-types";
import personRaw from "@content/site/person.json";
import cdnRaw from "@content/config/cdn.json";
import authRaw from "@content/config/auth.json";
import uiRaw from "@content/config/ui.json";
import threeDefaultsRaw from "@content/config/three-defaults.json";
import stringsRaw from "@content/site/strings.json";
import zIndexRaw from "@content/config/z-index.json";
import themeFallbacksRaw from "@content/config/theme-fallbacks.json";

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
  } catch (err) {
    console.warn("[web-core] Failed to parse hostname", value, err);
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

/** Pre-normalized site URL without trailing slash. */
export const siteBaseUrl: string = siteUrl.replace(/\/+$/, "");

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

export const twitterSite: string =
  typeof (personRaw as { twitterSite?: string }).twitterSite === "string"
    ? (personRaw as { twitterSite: string }).twitterSite
    : "";

export const twitterCreator: string =
  typeof (personRaw as { twitterCreator?: string }).twitterCreator === "string"
    ? (personRaw as { twitterCreator: string }).twitterCreator
    : "";

export const siteMetadata = {
  title: person?.name ?? "Site",
  description: person ? `${person.jobTitle} — ${person.name}` : "Site",
};

/**
 * Per-page `layoutFromJson` flag is now read from individual page definitions
 * by the pipeline. See `PeblorPageClientPage.layoutFromJson` in @pb/core.
 *
 * Pages that provide their own header/footer from peblor JSON set this field
 * directly in their page JSON. The flag is available on the resolved page props
 * for the layout component to consume.
 */

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
    : [...CDN_ALLOWED_EXTENSIONS];

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
  typeof cdnImagesConfig?.defaultFormat === "string" ? cdnImagesConfig.defaultFormat : "auto";
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

const uiBreakpointsConfig = uiConfig?.breakpoints as Record<string, unknown> | undefined;
export const uiBreakpointDesktopPx: number =
  typeof uiBreakpointsConfig?.desktopPx === "number" ? uiBreakpointsConfig.desktopPx : 768;

const uiLayoutConfig = uiConfig?.layout as Record<string, unknown> | undefined;
export const uiNavHeightFallbackPx: number =
  typeof uiLayoutConfig?.navHeightFallbackPx === "number" ? uiLayoutConfig.navHeightFallbackPx : 64;
export const uiPageBottomPaddingPx: number =
  typeof uiLayoutConfig?.pageBottomPaddingPx === "number" ? uiLayoutConfig.pageBottomPaddingPx : 48;

const uiMarqueeConfig = uiConfig?.marquee as Record<string, unknown> | undefined;
export const uiMarqueeDefaultGapPx: number =
  typeof uiMarqueeConfig?.defaultGapPx === "number" ? uiMarqueeConfig.defaultGapPx : 48;

const uiTooltipConfig = uiConfig?.tooltip as Record<string, unknown> | undefined;
export const uiTooltipGapDefaultPx: number =
  typeof uiTooltipConfig?.gapDefaultPx === "number" ? uiTooltipConfig.gapDefaultPx : 8;
export const uiTooltipViewportPadPx: number =
  typeof uiTooltipConfig?.viewportPadPx === "number" ? uiTooltipConfig.viewportPadPx : 8;
export const uiTooltipBridgeOverlapPx: number =
  typeof uiTooltipConfig?.bridgeOverlapPx === "number" ? uiTooltipConfig.bridgeOverlapPx : 6;
export const uiTooltipMaxWidthPx: number =
  typeof uiTooltipConfig?.maxWidthPx === "number" ? uiTooltipConfig.maxWidthPx : 320;

const uiRangeConfig = uiConfig?.range as Record<string, unknown> | undefined;
export const uiRangeDefaultBorderRadius: string =
  typeof uiRangeConfig?.defaultBorderRadius === "string"
    ? uiRangeConfig.defaultBorderRadius
    : "9999px";
export const uiRangeThumbGlassBezelFactor: number =
  typeof uiRangeConfig?.thumbGlassBezelFactor === "number"
    ? uiRangeConfig.thumbGlassBezelFactor
    : 0.16;

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

// ---------------------------------------------------------------------------
// Triggers / behavioral constants
// ---------------------------------------------------------------------------

const uiTriggersConfig = uiConfig?.triggers as Record<string, unknown> | undefined;
export const uiIdleAfterMs: number =
  typeof uiTriggersConfig?.idleAfterMs === "number" ? uiTriggersConfig.idleAfterMs : 5000;
export const uiAudioSleepAfterMs: number =
  typeof uiTriggersConfig?.audioSleepAfterMs === "number"
    ? uiTriggersConfig.audioSleepAfterMs
    : 3000;
export const uiScrollDirectionThresholdPx: number =
  typeof uiTriggersConfig?.scrollDirectionThresholdPx === "number"
    ? uiTriggersConfig.scrollDirectionThresholdPx
    : 5;
export const uiViewportThresholdSteps: number =
  typeof uiTriggersConfig?.viewportThresholdSteps === "number"
    ? uiTriggersConfig.viewportThresholdSteps
    : 21;

const uiVideoControlsConfig = uiConfig?.videoControls as Record<string, unknown> | undefined;
export const uiVideoDefaultControlsList: string =
  typeof uiVideoControlsConfig?.defaultControlsList === "string"
    ? uiVideoControlsConfig.defaultControlsList
    : "nodownload nofullscreen";

// ---------------------------------------------------------------------------
// 3D scene defaults
// ---------------------------------------------------------------------------

const threeConfig = (threeDefaultsRaw as { three?: Record<string, unknown> }).three;
const threeLightsConfig = threeConfig?.lights as Record<string, unknown> | undefined;
export const threeAmbientIntensity: number =
  typeof threeLightsConfig?.ambientIntensity === "number"
    ? threeLightsConfig.ambientIntensity
    : 0.5;
export const threeSpotAngle: number =
  typeof threeLightsConfig?.spotAngle === "number" ? threeLightsConfig.spotAngle : 0.1;
export const threeSpotPenumbra: number =
  typeof threeLightsConfig?.spotPenumbra === "number" ? threeLightsConfig.spotPenumbra : 0.5;

const threeCameraConfig = threeConfig?.cameraEffects as Record<string, unknown> | undefined;
export const threeCameraBobbingAmount: number =
  typeof threeCameraConfig?.bobbingAmount === "number" ? threeCameraConfig.bobbingAmount : 0.3;
export const threeCameraBobbingSpeed: number =
  typeof threeCameraConfig?.bobbingSpeed === "number" ? threeCameraConfig.bobbingSpeed : 0.8;
export const threeCameraMouseSensitivity: number =
  typeof threeCameraConfig?.mouseSensitivity === "number"
    ? threeCameraConfig.mouseSensitivity
    : -0.2;
export const threeCameraMouseSmoothness: number =
  typeof threeCameraConfig?.mouseSmoothness === "number" ? threeCameraConfig.mouseSmoothness : 0.1;

const threeSceneConfig = threeConfig?.scene as Record<string, unknown> | undefined;
export const threeSceneOrthoSize: number =
  typeof threeSceneConfig?.orthoSize === "number" ? threeSceneConfig.orthoSize : 0.1;
export const threeScenePerspNear: number =
  typeof threeSceneConfig?.perspNear === "number" ? threeSceneConfig.perspNear : 0.1;

const threePostConfig = threeConfig?.postProcessing as Record<string, unknown> | undefined;
export const threeNoiseOpacity: number =
  typeof threePostConfig?.noiseOpacity === "number" ? threePostConfig.noiseOpacity : 0.5;
export const threeBloomLuminanceThreshold: number =
  typeof threePostConfig?.bloomLuminanceThreshold === "number"
    ? threePostConfig.bloomLuminanceThreshold
    : 0.9;
export const threeBloomLuminanceSmoothing: number =
  typeof threePostConfig?.bloomLuminanceSmoothing === "number"
    ? threePostConfig.bloomLuminanceSmoothing
    : 0.025;
export const threeBloomRadius: number =
  typeof threePostConfig?.bloomRadius === "number" ? threePostConfig.bloomRadius : 0.85;
export const threeSsaoLuminanceInfluence: number =
  typeof threePostConfig?.ssaoLuminanceInfluence === "number"
    ? threePostConfig.ssaoLuminanceInfluence
    : 0.9;
export const threeSsaoBias: number =
  typeof threePostConfig?.ssaoBias === "number" ? threePostConfig.ssaoBias : 0.025;
export const threeSsaoFade: number =
  typeof threePostConfig?.ssaoFade === "number" ? threePostConfig.ssaoFade : 0.01;
export const threeSsaoRangeThreshold: number =
  typeof threePostConfig?.ssaoRangeThreshold === "number"
    ? threePostConfig.ssaoRangeThreshold
    : 0.5;
export const threeSsaoRangeFalloff: number =
  typeof threePostConfig?.ssaoRangeFalloff === "number" ? threePostConfig.ssaoRangeFalloff : 0.1;

// ---------------------------------------------------------------------------
// Strings (i18n path)
// ---------------------------------------------------------------------------

const stringsConfig = (stringsRaw as { strings?: Record<string, unknown> }).strings;
const stringsAriaLabels = stringsConfig?.ariaLabels as Record<string, unknown> | undefined;
const stringsLabels = stringsConfig?.labels as Record<string, unknown> | undefined;
const stringsPlaceholders = stringsConfig?.placeholders as Record<string, unknown> | undefined;
const stringsErrors = stringsConfig?.errors as Record<string, unknown> | undefined;

export const stringsAriaLabelContentBlock: string =
  typeof stringsAriaLabels?.contentBlock === "string"
    ? stringsAriaLabels.contentBlock
    : "Content block";
export const stringsAriaLabelColumnLayout: string =
  typeof stringsAriaLabels?.columnLayout === "string"
    ? stringsAriaLabels.columnLayout
    : "Column layout";
export const stringsAriaLabelForm: string =
  typeof stringsAriaLabels?.form === "string" ? stringsAriaLabels.form : "Form";
export const stringsAriaLabelVideoQuality: string =
  typeof stringsAriaLabels?.videoQuality === "string"
    ? stringsAriaLabels.videoQuality
    : "Video quality";
export const stringsAriaLabelCarousel: string =
  typeof stringsAriaLabels?.carousel === "string" ? stringsAriaLabels.carousel : "Carousel";
export const stringsAriaLabelSectionScrollProgress: string =
  typeof stringsAriaLabels?.sectionScrollProgress === "string"
    ? stringsAriaLabels.sectionScrollProgress
    : "Section scroll progress";
export const stringsAriaLabelNotifications: string =
  typeof stringsAriaLabels?.notifications === "string"
    ? stringsAriaLabels.notifications
    : "Notifications";
export const stringsAriaLabelDraggableContent: string =
  typeof stringsAriaLabels?.draggableContent === "string"
    ? stringsAriaLabels.draggableContent
    : "Draggable content";
export const stringsLabelSubmitButton: string =
  typeof stringsLabels?.submitButton === "string" ? stringsLabels.submitButton : "Submit";
export const stringsLabelSelectPlaceholder: string =
  typeof stringsLabels?.selectPlaceholder === "string" ? stringsLabels.selectPlaceholder : "Select";
export const stringsLabelTooltipTriggerClick: string =
  typeof stringsLabels?.tooltipTriggerClick === "string"
    ? stringsLabels.tooltipTriggerClick
    : "Click";
export const stringsLabelTooltipTriggerFocus: string =
  typeof stringsLabels?.tooltipTriggerFocus === "string"
    ? stringsLabels.tooltipTriggerFocus
    : "Focus";
export const stringsLabelTooltipTriggerHover: string =
  typeof stringsLabels?.tooltipTriggerHover === "string"
    ? stringsLabels.tooltipTriggerHover
    : "Hover";
export const stringsPlaceholderSearchInput: string =
  typeof stringsPlaceholders?.searchInput === "string" ? stringsPlaceholders.searchInput : "Search";
export const stringsErrorVideoSourceMissing: string =
  typeof stringsErrors?.videoSourceMissing === "string"
    ? stringsErrors.videoSourceMissing
    : "Video source missing";

// ---------------------------------------------------------------------------
// Z-index scale
// ---------------------------------------------------------------------------

const zIndexConfig = (zIndexRaw as { zIndex?: Record<string, unknown> }).zIndex;
export const zIndexBase: number = typeof zIndexConfig?.base === "number" ? zIndexConfig.base : 0;
export const zIndexRaised: number =
  typeof zIndexConfig?.raised === "number" ? zIndexConfig.raised : 1;
export const zIndexContent: number =
  typeof zIndexConfig?.content === "number" ? zIndexConfig.content : 2;
export const zIndexOverlay: number =
  typeof zIndexConfig?.overlay === "number" ? zIndexConfig.overlay : 5;
export const zIndexColumnGrid: number =
  typeof zIndexConfig?.columnGrid === "number" ? zIndexConfig.columnGrid : 10;
export const zIndexFixedSection: number =
  typeof zIndexConfig?.fixedSection === "number" ? zIndexConfig.fixedSection : 50;

// ---------------------------------------------------------------------------
// Theme fallbacks
// ---------------------------------------------------------------------------

const themeFallbacksConfig = (themeFallbacksRaw as { themeFallbacks?: Record<string, unknown> })
  .themeFallbacks;
const themeFallbackColors = themeFallbacksConfig?.colors as Record<string, unknown> | undefined;

export const defaultTheme: "light" | "dark" =
  themeFallbacksConfig?.defaultTheme === "light" || themeFallbacksConfig?.defaultTheme === "dark"
    ? (themeFallbacksConfig.defaultTheme as "light" | "dark")
    : "dark";
export const colorTooltipBg: string =
  typeof themeFallbackColors?.tooltipBg === "string"
    ? themeFallbackColors.tooltipBg
    : "rgb(15 15 18 / 0.94)";
export const colorInputText: string =
  typeof themeFallbackColors?.inputText === "string"
    ? themeFallbackColors.inputText
    : "rgba(255, 255, 255, 0.85)";
export const colorImageCompareHandle: string =
  typeof themeFallbackColors?.imageCompareHandle === "string"
    ? themeFallbackColors.imageCompareHandle
    : "#fff";
export const colorLight3d: string =
  typeof themeFallbackColors?.lightColor3d === "string"
    ? themeFallbackColors.lightColor3d
    : "#ffffff";
export const colorVideoPlaceholderBg: string =
  typeof themeFallbackColors?.videoPlaceholderBg === "string"
    ? themeFallbackColors.videoPlaceholderBg
    : "rgba(255,255,255,0.06)";
export const colorVideoErrorText: string =
  typeof themeFallbackColors?.videoErrorText === "string"
    ? themeFallbackColors.videoErrorText
    : "rgba(255,255,255,0.85)";
export const colorVideoErrorBg: string =
  typeof themeFallbackColors?.videoErrorBg === "string"
    ? themeFallbackColors.videoErrorBg
    : "rgba(0,0,0,0.55)";
export const colorVideoErrorBlur: string =
  typeof themeFallbackColors?.videoErrorBlur === "string"
    ? themeFallbackColors.videoErrorBlur
    : "blur(8px)";
export const colorMarqueeGradientEdgeFallback: string =
  typeof themeFallbackColors?.marqueeGradientEdgeFallback === "string"
    ? themeFallbackColors.marqueeGradientEdgeFallback
    : "#000";
