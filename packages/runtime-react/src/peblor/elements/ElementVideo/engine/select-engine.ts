"use client";

import type { VideoEngineKind } from "./video-engine-types";

function srcPathname(src: string): string {
  try {
    return new URL(src, "https://local.invalid").pathname.toLowerCase();
  } catch {
    return src.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  }
}

export function isHlsVideoSource(src: string): boolean {
  return srcPathname(src).endsWith(".m3u8");
}

export function isDashVideoSource(src: string): boolean {
  return srcPathname(src).endsWith(".mpd");
}

function hasMediaSourceSupport(): boolean {
  return typeof window !== "undefined" && "MediaSource" in window;
}

export function selectVideoEngineKind(video: HTMLVideoElement, src: string): VideoEngineKind {
  if (isDashVideoSource(src)) {
    return hasMediaSourceSupport() ? "dash-js" : "progressive";
  }
  if (!isHlsVideoSource(src)) return "progressive";
  if (video.canPlayType("application/vnd.apple.mpegurl")) return "native-hls";
  return "hls-js";
}
