import { setCoreConfig } from "@pb/core/util";
import { initCoreGlobalsFromContent } from "@pb/core/lib/globals-init";
import {
  siteUrl,
  assetBaseUrl,
  person,
  siteMetadata,
  layoutFromJsonSlugs,
  cdnBase,
  cdnTokenExpiryDays,
  cdnClientCacheExpiryHours,
  cdnApiCacheMaxAge,
  cdnApiCacheStaleWhileRevalidate,
  cdnAllowedHosts,
  cdnAllowedExtensions,
  imageDefaultWidth,
  imageDefaultPosterWidth,
  imagePosterWidth,
  imageMobileMaxWidth,
  imageMobileMaxWidth2x,
  imageDefaultQuality,
  imagePosterQuality,
  imageDefaultFormat,
  imageDefaultAspectRatio,
  imagePosterAspectRatio,
  imageClass,
  imagePosterClass,
  accessCookieName,
  accessCookieMaxAgeDays,
  rateLimitCookieName,
  rateLimitMaxAttempts,
  rateLimitLockoutMinutes,
  rateLimitCookieExpiryHours,
  formRateLimitMaxPerHour,
  uiResizeDebounceMs,
  uiVideoPauseButtonHideDelayMs,
  uiHeroCarouselOpacityCurve,
  uiHeroCarouselPlaceholderBackgrounds,
  uiVideoDoubleTapThresholdMs,
  uiVideoHoldThresholdMs,
  uiVideoHoldRepeatMs,
  uiVideoFeedbackDurationMs,
  uiVideoSeekBackSeconds,
  uiVideoSeekForwardSeconds,
  uiVideoDefaultAspectRatio,
  cacheVideoUrlPrefix,
} from "@/core/lib/globals";
import { configureRuntimeGlobals } from "@pb/runtime-react/core/lib/globals";
import { initAnalytics, getAnalyticsOptions } from "@/core/lib/analytics";
import { validateRequiredRuntimeEnv } from "@/core/lib/required-runtime-env";
import { pbBuilderDefaultsV1 } from "@/app/theme/pb-builder-defaults";
import { pbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import { getProductionWorkbenchSession } from "@/app/dev/workbench/workbench-defaults";

let bootstrapped = false;

export function bootstrapCore(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  validateRequiredRuntimeEnv();

  setCoreConfig({
    builderDefaults: {
      ...pbBuilderDefaultsV1,
      workbenchElements: getProductionWorkbenchSession().elements,
    },
    contentGuidelines: pbContentGuidelines,
  });

  initCoreGlobalsFromContent();

  configureRuntimeGlobals({
    siteUrl,
    assetBaseUrl,
    person,
    siteMetadata,
    layoutFromJsonSlugs,
    cdnBase,
    cdnTokenExpiryDays,
    cdnClientCacheExpiryHours,
    cdnApiCacheMaxAge,
    cdnApiCacheStaleWhileRevalidate,
    cdnAllowedHosts,
    cdnAllowedExtensions,
    imageDefaultWidth,
    imageDefaultPosterWidth,
    imagePosterWidth,
    imageMobileMaxWidth,
    imageMobileMaxWidth2x,
    imageDefaultQuality,
    imagePosterQuality,
    imageDefaultFormat,
    imageDefaultAspectRatio,
    imagePosterAspectRatio,
    imageClass,
    imagePosterClass,
    accessCookieName,
    accessCookieMaxAgeDays,
    rateLimitCookieName,
    rateLimitMaxAttempts,
    rateLimitLockoutMinutes,
    rateLimitCookieExpiryHours,
    formRateLimitMaxPerHour,
    uiResizeDebounceMs,
    uiVideoPauseButtonHideDelayMs,
    uiHeroCarouselOpacityCurve,
    uiHeroCarouselPlaceholderBackgrounds,
    uiVideoDoubleTapThresholdMs,
    uiVideoHoldThresholdMs,
    uiVideoHoldRepeatMs,
    uiVideoFeedbackDurationMs,
    uiVideoSeekBackSeconds,
    uiVideoSeekForwardSeconds,
    uiVideoDefaultAspectRatio,
    cacheVideoUrlPrefix,
  });

  initAnalytics(getAnalyticsOptions());
}

export { getAnalyticsOptions } from "@/core/lib/analytics";
