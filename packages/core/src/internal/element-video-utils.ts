/**
 * Pure helpers for ElementVideo. No React, no DOM.
 * Used by ElementVideo and use-video-controls; unit-testable.
 */

import type { CSSProperties } from "react";
import { resolveGraphicLinkHref } from "../lib/url-policy";

export type VideoShowWhenState = {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
};

/** Resolve showWhen from JSON to boolean (e.g. assetPlaying → isPlaying). */
export function resolveVideoShowWhen(
  showWhen: string | undefined,
  state: VideoShowWhenState
): boolean {
  if (!showWhen) return true;
  switch (showWhen) {
    case "assetPlaying":
      return state.isPlaying;
    case "assetPaused":
      return !state.isPlaying;
    case "assetMuted":
      return state.isMuted;
    case "assetUnmuted":
      return !state.isMuted;
    case "videoFullscreen":
      return state.isFullscreen;
    case "videoContained":
      return !state.isFullscreen;
    default:
      return true;
  }
}

export type VideoActionHandlers = {
  onPlay: () => void;
  onPause: () => void;
  onTogglePlay: () => void;
  onSeek: (delta: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
};

/** Get action handler from JSON action + payload. */
export function getVideoActionHandler(
  action: string | undefined,
  payload: number | undefined,
  handlers: VideoActionHandlers
): (() => void) | undefined {
  if (!action) return undefined;
  switch (action) {
    case "assetPlay":
      return handlers.onPlay;
    case "assetPause":
      return handlers.onPause;
    case "assetTogglePlay":
      return handlers.onTogglePlay;
    case "assetSeek":
      return () => handlers.onSeek(payload ?? 0);
    case "assetMute":
      return handlers.onMuteToggle;
    case "videoFullscreen":
      return handlers.onFullscreenToggle;
    default:
      return undefined;
  }
}

export type VideoLinkInput =
  | {
      ref?: string;
      external?: boolean;
      target?: "_self" | "_blank" | "_parent" | "_top";
      rel?: string;
    }
  | null
  | undefined;

export type ResolvedVideoLink = {
  isLinkable: boolean;
  resolvedHref: string | null;
  isInternal: boolean;
  target?: "_self" | "_blank" | "_parent" | "_top";
  rel?: string;
};

/** Resolve link ref to href and whether internal. */
export function resolveVideoLink(link: VideoLinkInput, showPlayButton: boolean): ResolvedVideoLink {
  if (!link) {
    return { isLinkable: false, resolvedHref: null, isInternal: false };
  }
  const isLinkable = !showPlayButton && !!link?.ref;
  if (!isLinkable) {
    return { isLinkable: false, resolvedHref: null, isInternal: false };
  }
  const resolvedHref = resolveGraphicLinkHref(link?.ref, link?.external);
  if (!resolvedHref) {
    return { isLinkable: false, resolvedHref: null, isInternal: false };
  }
  const isInternal = !link?.external && resolvedHref.startsWith("/");
  const resolvedTarget = link?.target ?? (link?.external ? "_blank" : undefined);
  const resolvedRel =
    link?.rel ??
    (link?.external || resolvedTarget === "_blank" ? "noopener noreferrer" : undefined);
  return {
    isLinkable,
    resolvedHref,
    isInternal,
    ...(resolvedTarget ? { target: resolvedTarget } : {}),
    ...(resolvedRel ? { rel: resolvedRel } : {}),
  };
}

export type ElementVideoObjectFit = "cover" | "contain" | "fillWidth" | "fillHeight" | undefined;

export type VideoSourceCandidate = {
  src: string;
  type?: string;
  label?: string;
};

export type VideoSourceSupportProbe = {
  canPlayType: (type: string) => string;
  hasMediaSource: boolean;
  isMediaSourceTypeSupported: (type: string) => boolean;
};

function srcPathname(src: string): string {
  try {
    return new URL(src, "https://local.invalid").pathname.toLowerCase();
  } catch {
    return src.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  }
}

function isHlsVideoSource(src: string, type?: string): boolean {
  return (
    srcPathname(src).endsWith(".m3u8") || type?.includes("application/vnd.apple.mpegurl") === true
  );
}

function isDashVideoSource(src: string): boolean {
  return srcPathname(src).endsWith(".mpd");
}

function hasVp9Codec(type: string | undefined): boolean {
  return /vp09|vp9/i.test(type ?? "");
}

function hasHevcCodec(type: string | undefined): boolean {
  return /hvc1|hev1/i.test(type ?? "");
}

function mediaSourceMime(type: string | undefined): string | undefined {
  return type?.replace("application/vnd.apple.mpegurl", "video/mp4");
}

function isSupportedByMediaSource(
  type: string | undefined,
  probe: VideoSourceSupportProbe
): boolean {
  if (!probe.hasMediaSource) return false;
  const mseType = mediaSourceMime(type);
  return !mseType || probe.isMediaSourceTypeSupported(mseType);
}

function canUseVideoSource(source: VideoSourceCandidate, probe: VideoSourceSupportProbe): boolean {
  const type = source.type;
  const isHls = isHlsVideoSource(source.src, type);
  const isDash = isDashVideoSource(source.src);

  if (isDash) return isSupportedByMediaSource(type, probe);

  if (!isHls) return !type || probe.canPlayType(type) !== "";

  if (type && probe.canPlayType(type) !== "") return true;

  const supportsNativeHls = probe.canPlayType("application/vnd.apple.mpegurl") !== "";
  if (supportsNativeHls && !hasVp9Codec(type) && !hasHevcCodec(type)) return true;

  return isSupportedByMediaSource(type, probe);
}

function orderedVideoSources(
  src: string | undefined,
  sources: VideoSourceCandidate[] | undefined
): VideoSourceCandidate[] {
  const explicit = Array.isArray(sources)
    ? sources.filter((source) => source.src.trim().length > 0)
    : [];
  if (explicit.length > 0) return explicit;
  return src && src.trim().length > 0 ? [{ src }] : [];
}

export function choosePreferredVideoSource(
  src: string | undefined,
  sources: VideoSourceCandidate[] | undefined,
  probe?: VideoSourceSupportProbe
): string {
  const candidates = orderedVideoSources(src, sources);
  if (!probe) return candidates[0]?.src ?? "";

  const supported = candidates.filter((source) => canUseVideoSource(source, probe));
  const playable = supported.length > 0 ? supported : candidates;
  const supportsNativeHls = probe.canPlayType("application/vnd.apple.mpegurl") !== "";

  if (supportsNativeHls) {
    const nativeHls = playable.find((source) => isHlsVideoSource(source.src, source.type));
    if (nativeHls) return nativeHls.src;
  }

  return playable[0]?.src ?? "";
}

/** Resolve objectFit when it may be a responsive tuple; returns single value. */
function resolveObjectFit(
  objectFit: ElementVideoObjectFit | [ElementVideoObjectFit, ElementVideoObjectFit],
  isMobile = false
): ElementVideoObjectFit {
  return Array.isArray(objectFit)
    ? isMobile
      ? objectFit[0]
      : (objectFit[1] ?? objectFit[0])
    : objectFit;
}

/**
 * Inner wrapper style for video (transform wrapper + objectFit-based flex).
 * baseStyle is typically from getElementTransformStyle (element-layout-utils).
 */
export function getElementVideoInnerStyle(
  baseStyle: CSSProperties,
  objectFit: ElementVideoObjectFit | [ElementVideoObjectFit, ElementVideoObjectFit]
): CSSProperties {
  const fit = resolveObjectFit(objectFit);
  if (fit === "fillWidth") return { ...baseStyle, height: "auto", alignItems: "stretch" };
  if (fit === "fillHeight") return { ...baseStyle, width: "auto", justifyContent: "stretch" };
  return baseStyle;
}

/** Video element CSS by objectFit (and optional objectPosition). Accepts responsive tuple; uses first value. */
export function getElementVideoVideoStyle(
  objectFit: ElementVideoObjectFit | [ElementVideoObjectFit, ElementVideoObjectFit],
  objectPosition?: string
): CSSProperties {
  const fit = Array.isArray(objectFit) ? objectFit[0] : objectFit;
  const base: CSSProperties = { display: "block", maxWidth: "100%", maxHeight: "100%" };
  if (fit === "cover" || fit === "contain") {
    return {
      ...base,
      width: "100%",
      height: "100%",
      objectFit: fit,
      ...(objectPosition ? { objectPosition } : {}),
    };
  }
  if (fit === "fillWidth") {
    return { ...base, width: "100%", height: "auto" };
  }
  if (fit === "fillHeight") {
    return { ...base, height: "100%", width: "auto" };
  }
  return {
    ...base,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    ...(objectPosition ? { objectPosition } : {}),
  };
}
