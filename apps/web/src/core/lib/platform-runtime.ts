"use client";

export type ClientPlatform = "ios" | "android" | "other";

type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    brands?: Array<{ brand?: string }>;
  };
};

function getNavigatorBrands(): string[] {
  if (typeof navigator === "undefined") return [];
  const nav = navigator as NavigatorWithUAData;
  const brands = nav.userAgentData?.brands;
  if (!Array.isArray(brands)) return [];
  return brands
    .map((entry) => (typeof entry?.brand === "string" ? entry.brand : ""))
    .filter((brand) => brand.length > 0);
}

function isChromiumDesktopUserAgent(userAgent: string, platform: ClientPlatform): boolean {
  if (platform !== "other") return false;
  const hasChromiumBrand = getNavigatorBrands().some((brand) =>
    /Chromium|Google Chrome|Microsoft Edge|Opera/i.test(brand)
  );
  if (hasChromiumBrand) return true;
  return /Chrome|Chromium|Edg\/|OPR\//i.test(userAgent);
}

export function detectClientPlatformSnapshot(): ClientPlatform {
  if (typeof navigator === "undefined") return "other";
  const userAgent = navigator.userAgent ?? "";
  const platform = navigator.platform ?? "";
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  const isIOSUserAgent = /iPhone|iPad|iPod/i.test(userAgent);
  // iPadOS desktop UA can appear as "MacIntel". Requiring "Mobile/" avoids desktop false positives.
  const isLikelyIPadDesktopUA =
    platform === "MacIntel" && maxTouchPoints > 1 && /Mobile\//i.test(userAgent);
  if (isIOSUserAgent || isLikelyIPadDesktopUA) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

export function isMobileClientPlatform(platform: ClientPlatform): boolean {
  return platform === "ios" || platform === "android";
}

export function getSupportsBackdropFilterUrlClientSnapshot(): boolean {
  if (
    typeof CSS === "undefined" ||
    typeof CSS.supports !== "function" ||
    typeof navigator === "undefined"
  ) {
    return false;
  }
  const userAgent = navigator.userAgent ?? "";
  const platform = detectClientPlatformSnapshot();
  if (isChromiumDesktopUserAgent(userAgent, platform)) return true;
  return CSS.supports("backdrop-filter", "url(#x)");
}
