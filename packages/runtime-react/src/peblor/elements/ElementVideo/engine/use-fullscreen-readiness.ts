"use client";

import { useCallback } from "react";

type VideoWithWebkit = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

function canEnterFullscreenNow(video: VideoWithWebkit): boolean {
  if (video.webkitEnterFullscreen) {
    return video.readyState >= HTMLMediaElement.HAVE_METADATA;
  }
  return true;
}

function tryEnterIosFullscreen(video: VideoWithWebkit): boolean {
  video.webkitEnterFullscreen?.();
  return video.webkitDisplayingFullscreen === true;
}

function primeForIosFullscreen(video: VideoWithWebkit, enterFullscreen: () => void) {
  let done = false;
  let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    done = true;
    cleanup();
  }, 4000);

  const cleanup = () => {
    video.removeEventListener("loadedmetadata", onReady);
    video.removeEventListener("loadeddata", onReady);
    video.removeEventListener("error", onError);
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const onReady = () => {
    if (done) return;
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) return;
    done = true;
    cleanup();
    enterFullscreen();
  };

  const onError = () => {
    done = true;
    cleanup();
  };

  video.addEventListener("loadedmetadata", onReady);
  video.addEventListener("loadeddata", onReady);
  video.addEventListener("error", onError);

  if (video.preload !== "auto") {
    video.preload = "auto";
  }

  try {
    video.load();
  } catch {}

  try {
    void video.play().catch(() => {});
  } catch {}

  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    onReady();
  } else {
    enterFullscreen();
  }
}

export function useFullscreenReadiness({
  videoRef,
  containerRef,
  shouldLoadVideo,
  armVideoLoadImmediately,
  startLoad,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  shouldLoadVideo: boolean;
  armVideoLoadImmediately: () => void;
  startLoad: (currentTime?: number) => void;
}) {
  return useCallback(() => {
    const video = videoRef.current as VideoWithWebkit | null;
    const container = containerRef.current;
    if (!video) return;

    if (video.webkitEnterFullscreen) {
      if (video.webkitDisplayingFullscreen) {
        video.webkitExitFullscreen?.();
        return;
      }
    } else if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    if (!video.webkitEnterFullscreen) {
      if (container) {
        void container.requestFullscreen().catch(() => {});
      }
      return;
    }

    if (canEnterFullscreenNow(video)) {
      video.webkitEnterFullscreen();
      return;
    }

    if (!shouldLoadVideo) {
      armVideoLoadImmediately();
    }

    startLoad(video.currentTime);
    primeForIosFullscreen(video, () => {
      tryEnterIosFullscreen(video);
    });
  }, [armVideoLoadImmediately, containerRef, shouldLoadVideo, startLoad, videoRef]);
}
