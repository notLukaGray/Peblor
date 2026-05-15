"use client";

import type Hls from "hls.js";
import type { VideoEngine, VideoEngineAttachParams } from "./video-engine-types";

export class HlsJsEngine implements VideoEngine {
  readonly kind = "hls-js" as const;
  private video: HTMLVideoElement | null = null;
  private hls: Hls | null = null;
  private destroyed = false;
  private playListener: (() => void) | null = null;
  private networkRecovered = false;
  private mediaRecovered = false;

  attach({ video, src, autoplay, streamingConfig, callbacks }: VideoEngineAttachParams) {
    this.video = video;
    callbacks.onQualityLevelsChange([]);
    callbacks.onSelectedQualityChange("auto");
    callbacks.onErrorChange(null);

    void import("hls.js").then((module) => {
      if (this.destroyed) return;
      const HlsCtor = module.default;
      if (!HlsCtor.isSupported()) {
        callbacks.onErrorChange("unsupported");
        return;
      }

      const effectiveAutoStartLoad = autoplay ? true : (streamingConfig?.autoStartLoad ?? false);
      const hls = new HlsCtor({
        enableWorker: true,
        autoStartLoad: effectiveAutoStartLoad,
        startFragPrefetch: false,
        maxBufferLength: streamingConfig?.maxBufferLength ?? 20,
        maxMaxBufferLength: 60,
        maxBufferSize: streamingConfig?.maxBufferSize ?? 10 * 1000 * 1000,
      });

      this.hls = hls;
      hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
        callbacks.onQualityLevelsChange(
          hls.levels.map((level, index) => {
            const height = level.height > 0 ? level.height : undefined;
            const bitrate = level.bitrate > 0 ? level.bitrate : undefined;
            return {
              value: String(index),
              label: height
                ? `${height}p`
                : bitrate
                  ? `${Math.round(bitrate / 1000)} kbps`
                  : `Level ${index + 1}`,
              height,
              bitrate,
            };
          })
        );
        callbacks.onSelectedQualityChange(
          hls.currentLevel === -1 ? "auto" : String(hls.currentLevel)
        );
        callbacks.onErrorChange(null);
      });

      hls.on(HlsCtor.Events.LEVEL_SWITCHED, (_event, data) => {
        callbacks.onSelectedQualityChange(hls.autoLevelEnabled ? "auto" : String(data.level));
      });

      hls.on(HlsCtor.Events.LEVEL_LOADED, () => {
        this.networkRecovered = false;
        this.mediaRecovered = false;
        callbacks.onErrorChange(null);
      });

      hls.on(HlsCtor.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === HlsCtor.ErrorTypes.NETWORK_ERROR && !this.networkRecovered) {
          this.networkRecovered = true;
          hls.startLoad(video.currentTime);
          return;
        }
        if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR && !this.mediaRecovered) {
          this.mediaRecovered = true;
          hls.recoverMediaError();
          hls.startLoad(video.currentTime);
          return;
        }
        callbacks.onErrorChange("fatal");
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      if (!effectiveAutoStartLoad) {
        this.playListener = () => {
          hls.startLoad(video.currentTime);
        };
        video.addEventListener("play", this.playListener);
      }
    });
  }

  detach() {
    this.destroyed = true;
    const video = this.video;
    this.video = null;
    if (video && this.playListener) {
      video.removeEventListener("play", this.playListener);
    }
    this.playListener = null;
    this.hls?.destroy();
    this.hls = null;
    if (!video) return;
    video.removeAttribute("src");
    video.load();
  }

  startLoad(currentTime?: number) {
    this.hls?.startLoad(currentTime ?? this.video?.currentTime ?? -1);
  }

  setSelectedQuality(value: string) {
    const hls = this.hls;
    if (!hls) return;
    if (value === "auto") {
      hls.currentLevel = -1;
      return;
    }
    const level = Number(value);
    if (Number.isInteger(level) && level >= 0 && level < hls.levels.length) {
      hls.currentLevel = level;
    }
  }
}
