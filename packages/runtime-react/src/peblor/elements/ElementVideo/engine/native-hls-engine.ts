"use client";

import type { VideoEngine, VideoEngineAttachParams } from "./video-engine-types";

function shouldKickVideoLoad(video: HTMLVideoElement): boolean {
  if (!video.currentSrc && !video.src) return true;
  if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) return true;
  return (
    video.readyState === HTMLMediaElement.HAVE_NOTHING && video.currentTime === 0 && video.paused
  );
}

export class NativeHlsEngine implements VideoEngine {
  readonly kind = "native-hls" as const;
  private video: HTMLVideoElement | null = null;
  private cleanup: (() => void) | null = null;

  attach({ video, src, callbacks }: VideoEngineAttachParams) {
    this.video = video;
    callbacks.onQualityLevelsChange([]);
    callbacks.onSelectedQualityChange("auto");
    callbacks.onErrorChange(null);
    video.src = src;
    const onError = () => callbacks.onErrorChange("fatal");
    video.addEventListener("error", onError);
    this.cleanup = () => {
      video.removeEventListener("error", onError);
    };
  }

  detach() {
    this.cleanup?.();
    this.cleanup = null;
    const video = this.video;
    this.video = null;
    if (!video) return;
    video.removeAttribute("src");
    video.load();
  }

  startLoad() {
    const video = this.video;
    if (!video || !shouldKickVideoLoad(video)) return;
    video.load();
  }

  setSelectedQuality() {}
}
