import {
  BREAKPOINT_TIER_MIN_PX,
  DESKTOP_TIER_NAME,
} from "@pb/contracts/peblor/core/breakpoint-tiers";

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
  uiBreakpointDesktopPx: number;
  uiNavHeightFallbackPx: number;
  uiPageBottomPaddingPx: number;
  uiMarqueeDefaultGapPx: number;
  uiTooltipGapDefaultPx: number;
  uiTooltipViewportPadPx: number;
  uiTooltipBridgeOverlapPx: number;
  uiTooltipMaxWidthPx: number;
  uiRangeDefaultBorderRadius: string;
  uiRangeThumbGlassBezelFactor: number;
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
  uiIdleAfterMs: number;
  uiAudioSleepAfterMs: number;
  uiScrollDirectionThresholdPx: number;
  uiViewportThresholdSteps: number;
  uiVideoDefaultControlsList: string;
  threeAmbientIntensity: number;
  threeSpotAngle: number;
  threeSpotPenumbra: number;
  threeCameraBobbingAmount: number;
  threeCameraBobbingSpeed: number;
  threeCameraMouseSensitivity: number;
  threeCameraMouseSmoothness: number;
  threeSceneOrthoSize: number;
  threeScenePerspNear: number;
  threeNoiseOpacity: number;
  threeBloomLuminanceThreshold: number;
  threeBloomLuminanceSmoothing: number;
  threeBloomRadius: number;
  threeSsaoLuminanceInfluence: number;
  threeSsaoBias: number;
  threeSsaoFade: number;
  threeSsaoRangeThreshold: number;
  threeSsaoRangeFalloff: number;
  stringsAriaLabelContentBlock: string;
  stringsAriaLabelColumnLayout: string;
  stringsAriaLabelForm: string;
  stringsAriaLabelVideoQuality: string;
  stringsAriaLabelCarousel: string;
  stringsAriaLabelSectionScrollProgress: string;
  stringsAriaLabelNotifications: string;
  stringsAriaLabelDraggableContent: string;
  stringsLabelSubmitButton: string;
  stringsLabelSelectPlaceholder: string;
  stringsLabelTooltipTriggerClick: string;
  stringsLabelTooltipTriggerFocus: string;
  stringsLabelTooltipTriggerHover: string;
  stringsPlaceholderSearchInput: string;
  stringsErrorVideoSourceMissing: string;
  zIndexBase: number;
  zIndexRaised: number;
  zIndexContent: number;
  zIndexOverlay: number;
  zIndexColumnGrid: number;
  zIndexFixedSection: number;
  defaultTheme: "light" | "dark";
  colorTooltipBg: string;
  colorInputText: string;
  colorImageCompareHandle: string;
  colorLight3d: string;
  colorVideoPlaceholderBg: string;
  colorVideoErrorText: string;
  colorVideoErrorBg: string;
  colorVideoErrorBlur: string;
  colorMarqueeGradientEdgeFallback: string;
};

const DEFAULTS: RuntimeGlobals = {
  siteUrl: "",
  assetBaseUrl: "",
  person: null,
  siteMetadata: { title: "Site", description: "Site" },
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
  imageMobileMaxWidth: BREAKPOINT_TIER_MIN_PX[DESKTOP_TIER_NAME],
  imageMobileMaxWidth2x: BREAKPOINT_TIER_MIN_PX[DESKTOP_TIER_NAME] * 2,
  imageDefaultQuality: 75,
  imagePosterQuality: 75,
  imageDefaultFormat: "auto",
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
  uiBreakpointDesktopPx: BREAKPOINT_TIER_MIN_PX[DESKTOP_TIER_NAME],
  uiNavHeightFallbackPx: 64,
  uiPageBottomPaddingPx: 48,
  uiMarqueeDefaultGapPx: 48,
  uiTooltipGapDefaultPx: 8,
  uiTooltipViewportPadPx: 8,
  uiTooltipBridgeOverlapPx: 6,
  uiTooltipMaxWidthPx: 320,
  uiRangeDefaultBorderRadius: "9999px",
  uiRangeThumbGlassBezelFactor: 0.16,
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
  uiIdleAfterMs: 5000,
  uiAudioSleepAfterMs: 3000,
  uiScrollDirectionThresholdPx: 5,
  uiViewportThresholdSteps: 21,
  uiVideoDefaultControlsList: "nodownload nofullscreen",
  threeAmbientIntensity: 0.5,
  threeSpotAngle: 0.1,
  threeSpotPenumbra: 0.5,
  threeCameraBobbingAmount: 0.3,
  threeCameraBobbingSpeed: 0.8,
  threeCameraMouseSensitivity: -0.2,
  threeCameraMouseSmoothness: 0.1,
  threeSceneOrthoSize: 0.1,
  threeScenePerspNear: 0.1,
  threeNoiseOpacity: 0.5,
  threeBloomLuminanceThreshold: 0.9,
  threeBloomLuminanceSmoothing: 0.025,
  threeBloomRadius: 0.85,
  threeSsaoLuminanceInfluence: 0.9,
  threeSsaoBias: 0.025,
  threeSsaoFade: 0.01,
  threeSsaoRangeThreshold: 0.5,
  threeSsaoRangeFalloff: 0.1,
  stringsAriaLabelContentBlock: "Content block",
  stringsAriaLabelColumnLayout: "Column layout",
  stringsAriaLabelForm: "Form",
  stringsAriaLabelVideoQuality: "Video quality",
  stringsAriaLabelCarousel: "Carousel",
  stringsAriaLabelSectionScrollProgress: "Section scroll progress",
  stringsAriaLabelNotifications: "Notifications",
  stringsAriaLabelDraggableContent: "Draggable content",
  stringsLabelSubmitButton: "Submit",
  stringsLabelSelectPlaceholder: "Select",
  stringsLabelTooltipTriggerClick: "Click",
  stringsLabelTooltipTriggerFocus: "Focus",
  stringsLabelTooltipTriggerHover: "Hover",
  stringsPlaceholderSearchInput: "Search",
  stringsErrorVideoSourceMissing: "Video source missing",
  zIndexBase: 0,
  zIndexRaised: 1,
  zIndexContent: 2,
  zIndexOverlay: 5,
  zIndexColumnGrid: 10,
  zIndexFixedSection: 50,
  defaultTheme: "dark",
  colorTooltipBg: "rgb(15 15 18 / 0.94)",
  colorInputText: "rgba(255, 255, 255, 0.85)",
  colorImageCompareHandle: "#fff",
  colorLight3d: "#ffffff",
  colorVideoPlaceholderBg: "rgba(255,255,255,0.06)",
  colorVideoErrorText: "rgba(255,255,255,0.85)",
  colorVideoErrorBg: "rgba(0,0,0,0.55)",
  colorVideoErrorBlur: "blur(8px)",
  colorMarqueeGradientEdgeFallback: "#000",
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
  if (patch.uiHeroCarouselOpacityCurve)
    _state.uiHeroCarouselOpacityCurve = [...patch.uiHeroCarouselOpacityCurve];
  if (patch.uiHeroCarouselPlaceholderBackgrounds)
    _state.uiHeroCarouselPlaceholderBackgrounds = [...patch.uiHeroCarouselPlaceholderBackgrounds];
}

export function resetRuntimeGlobals(): void {
  Object.assign(_state, DEFAULTS);
}
