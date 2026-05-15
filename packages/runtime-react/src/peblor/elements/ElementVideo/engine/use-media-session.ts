"use client";

import { useEffect } from "react";

export function useMediaSession({
  enabled,
  title,
  poster,
  play,
  pause,
  seek,
}: {
  enabled: boolean;
  title: string;
  poster?: string;
  play: () => Promise<boolean>;
  pause: () => void;
  seek: (deltaSeconds: number) => void;
}) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const mediaSession = navigator.mediaSession;
    if ("MediaMetadata" in window) {
      mediaSession.metadata = new MediaMetadata({
        title,
        artwork: poster ? [{ src: poster }] : undefined,
      });
    }

    mediaSession.setActionHandler("play", () => {
      void play();
    });
    mediaSession.setActionHandler("pause", pause);
    mediaSession.setActionHandler("seekbackward", (details) => {
      seek(-(details.seekOffset ?? 10));
    });
    mediaSession.setActionHandler("seekforward", (details) => {
      seek(details.seekOffset ?? 10);
    });

    return () => {
      mediaSession.setActionHandler("play", null);
      mediaSession.setActionHandler("pause", null);
      mediaSession.setActionHandler("seekbackward", null);
      mediaSession.setActionHandler("seekforward", null);
    };
  }, [enabled, pause, play, poster, seek, title]);
}
