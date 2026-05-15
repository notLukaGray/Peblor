"use client";

import type { ErrorEvent, MediaPlayerClass, MediaPlayerErrors, Representation } from "dashjs";
import type { VideoEngine, VideoEngineAttachParams } from "./video-engine-types";

const DASH_LOG_LEVEL_ERROR = 2;

function isRecoverableDashError(error: ErrorEvent["error"], errors: MediaPlayerErrors): boolean {
  if (typeof error === "string") {
    return error === "download";
  }
  if (typeof error !== "object" || error == null || !("code" in error)) return false;
  return (
    error.code === errors.FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE ||
    error.code === errors.FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE ||
    error.code === errors.DOWNLOAD_ERROR_ID_CONTENT_CODE ||
    error.code === errors.DOWNLOAD_ERROR_ID_INITIALIZATION_CODE ||
    error.code === errors.DATA_UPDATE_FAILED_ERROR_CODE
  );
}

export class DashJsEngine implements VideoEngine {
  readonly kind = "dash-js" as const;
  private player: MediaPlayerClass | null = null;
  private video: HTMLVideoElement | null = null;
  private destroyed = false;

  attach({ video, src, streamingConfig, callbacks }: VideoEngineAttachParams) {
    this.video = video;
    if (typeof window !== "undefined" && !("MediaSource" in window)) {
      callbacks.onErrorChange("unsupported");
      return;
    }

    callbacks.onQualityLevelsChange([]);
    callbacks.onSelectedQualityChange("auto");
    callbacks.onErrorChange(null);

    void import("dashjs").then((module) => {
      if (this.destroyed) return;
      const dash = module.MediaPlayer().create();
      this.player = dash;
      dash.updateSettings({
        debug: { logLevel: DASH_LOG_LEVEL_ERROR },
        streaming: {
          abr: { autoSwitchBitrate: { video: true } },
          buffer: {
            bufferTimeDefault: streamingConfig?.bufferTimeDefault ?? 12,
            bufferTimeAtTopQuality: streamingConfig?.bufferTimeAtTopQuality ?? 20,
            bufferToKeep: 10,
          },
        },
      });

      dash.on(module.MediaPlayer.events.STREAM_INITIALIZED, () => {
        const representations = dash.getRepresentationsByType("video") as Representation[];
        callbacks.onQualityLevelsChange(
          representations.map((representation, index) => {
            const height = representation.height > 0 ? representation.height : undefined;
            const bitrate = representation.bitrateInKbit > 0 ? representation.bitrateInKbit : 0;
            return {
              value: String(index),
              label: height
                ? `${height}p`
                : bitrate
                  ? `${Math.round(bitrate)} kbps`
                  : `Level ${index + 1}`,
              height,
              bitrate: bitrate ? bitrate * 1000 : undefined,
            };
          })
        );
        callbacks.onSelectedQualityChange("auto");
        callbacks.onErrorChange(null);
      });

      dash.on(module.MediaPlayer.events.QUALITY_CHANGE_RENDERED, () => {
        const current = dash.getCurrentRepresentationForType("video");
        const representations = dash.getRepresentationsByType("video");
        const nextIndex = current
          ? representations.findIndex((item) => item.id === current.id)
          : -1;
        callbacks.onSelectedQualityChange(nextIndex >= 0 ? String(nextIndex) : "auto");
      });

      dash.on(module.MediaPlayer.events.ERROR, (event: ErrorEvent) => {
        if (isRecoverableDashError(event.error, module.MediaPlayer.errors)) return;
        callbacks.onErrorChange("fatal");
      });

      dash.on(module.MediaPlayer.events.PLAYBACK_ERROR, () => {
        callbacks.onErrorChange("fatal");
      });

      dash.initialize(video, src, false, 0);
    });
  }

  detach() {
    this.destroyed = true;
    this.player?.destroy();
    this.player = null;
    const video = this.video;
    this.video = null;
    if (!video) return;
    video.removeAttribute("src");
    video.load();
  }

  startLoad() {
    this.player?.preload();
  }

  setSelectedQuality(value: string) {
    const player = this.player;
    if (!player) return;
    player.updateSettings({
      streaming: { abr: { autoSwitchBitrate: { video: value === "auto" } } },
    });
    if (value === "auto") return;
    const level = Number(value);
    if (Number.isInteger(level)) {
      player.setRepresentationForTypeByIndex("video", level, true);
    }
  }
}
