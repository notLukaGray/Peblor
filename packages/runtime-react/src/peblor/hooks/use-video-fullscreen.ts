"use client";

import { useEffect } from "react";
import { useFullscreenReadiness } from "@/peblor/elements/ElementVideo/engine/use-fullscreen-readiness";

/** iOS Safari: video-only fullscreen. Not on HTMLVideoElement in TS; we use at runtime. */
type VideoWithWebkit = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

export type UseVideoFullscreenParams = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  /** Video element when mounted (for iOS webkit listeners). */
  videoEl: HTMLVideoElement | null;
  setFullscreen: (v: boolean) => void;
  shouldLoadVideo: boolean;
  armVideoLoadImmediately: () => void;
  startLoad: (currentTime?: number) => void;
};

export type UseVideoFullscreenResult = {
  toggleFullscreen: () => void;
};

/**
 * Fullscreen for video: desktop uses container.requestFullscreen();
 * mobile/iOS uses video.webkitEnterFullscreen() when available.
 * Syncs isFullscreen from both fullscreenchange and webkitbeginfullscreen/webkitendfullscreen.
 */
export function useVideoFullscreen({
  videoRef,
  containerRef,
  videoEl,
  setFullscreen,
  shouldLoadVideo,
  armVideoLoadImmediately,
  startLoad,
}: UseVideoFullscreenParams): UseVideoFullscreenResult {
  const toggleFullscreen = useFullscreenReadiness({
    videoRef,
    containerRef,
    shouldLoadVideo,
    armVideoLoadImmediately,
    startLoad,
  });

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [setFullscreen]);

  useEffect(() => {
    if (!videoEl) return;
    const v = videoEl as VideoWithWebkit;
    const onBegin = () => setFullscreen(true);
    const onEnd = () => setFullscreen(false);
    const beginEv = "webkitbeginfullscreen";
    const endEv = "webkitendfullscreen";
    v.addEventListener(beginEv, onBegin);
    v.addEventListener(endEv, onEnd);
    return () => {
      v.removeEventListener(beginEv, onBegin);
      v.removeEventListener(endEv, onEnd);
    };
  }, [videoEl, setFullscreen]);

  return { toggleFullscreen };
}
