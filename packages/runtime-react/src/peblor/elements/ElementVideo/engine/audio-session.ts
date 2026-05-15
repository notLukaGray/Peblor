"use client";

import { useEffect, useState } from "react";

let audioOwner: HTMLVideoElement | null = null;

function isAudible(video: HTMLVideoElement): boolean {
  return !video.muted && video.volume > 0;
}

export function releaseAudioOwner(video: HTMLVideoElement) {
  if (audioOwner === video) {
    audioOwner = null;
  }
}

export function isAudioOwner(video: HTMLVideoElement | null): boolean {
  return !!video && audioOwner === video;
}

function claimAudioOwner(video: HTMLVideoElement) {
  if (audioOwner === video) return;
  const previousOwner = audioOwner;
  audioOwner = video;
  if (previousOwner && previousOwner !== video) {
    previousOwner.muted = true;
  }
}

export function useVideoAudioSession({
  videoEl,
  play,
  startLoad,
}: {
  videoEl: HTMLVideoElement | null;
  play: () => Promise<boolean>;
  startLoad: (currentTime?: number) => void;
}) {
  const [hasAudioOwnership, setHasAudioOwnership] = useState(false);

  useEffect(() => {
    if (!videoEl) return;

    const syncOwnership = () => {
      if (videoEl.paused || !isAudible(videoEl)) {
        releaseAudioOwner(videoEl);
        setHasAudioOwnership(false);
        return;
      }
      claimAudioOwner(videoEl);
      setHasAudioOwnership(isAudioOwner(videoEl));
    };

    const reprimeAudio = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (videoEl.paused || !isAudible(videoEl)) {
        syncOwnership();
        return;
      }
      claimAudioOwner(videoEl);
      startLoad(videoEl.currentTime);
      void play().finally(syncOwnership);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reprimeAudio();
      }
    };

    videoEl.addEventListener("play", syncOwnership);
    videoEl.addEventListener("pause", syncOwnership);
    videoEl.addEventListener("ended", syncOwnership);
    videoEl.addEventListener("emptied", syncOwnership);
    videoEl.addEventListener("volumechange", syncOwnership);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", reprimeAudio);

    syncOwnership();

    return () => {
      releaseAudioOwner(videoEl);
      videoEl.removeEventListener("play", syncOwnership);
      videoEl.removeEventListener("pause", syncOwnership);
      videoEl.removeEventListener("ended", syncOwnership);
      videoEl.removeEventListener("emptied", syncOwnership);
      videoEl.removeEventListener("volumechange", syncOwnership);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", reprimeAudio);
    };
  }, [play, startLoad, videoEl]);

  return { isAudioOwner: videoEl ? hasAudioOwnership : false };
}
