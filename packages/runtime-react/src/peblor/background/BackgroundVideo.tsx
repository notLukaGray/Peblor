"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BackgroundVideoProps } from "./BackgroundVideo/background-video-types";
import { lowerThemeStringToCss } from "@/peblor/theme/theme-string";

type Props = BackgroundVideoProps & { priority?: boolean };

const SECTION_CLASS =
  "pointer-events-none fixed inset-0 z-[var(--pb-z-base)] min-h-[100dvh] h-[100dvh] bg-black";

export function BackgroundVideo({ video, poster, overlay, priority }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failedVideo, setFailedVideo] = useState<string | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const handlePlaying = useCallback(() => setHasPlayed(true), []);
  const videoFailed = failedVideo === video;

  const resolvedOverlay = lowerThemeStringToCss(overlay);
  const overlayEl = resolvedOverlay ? (
    <div
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ backgroundColor: resolvedOverlay }}
      aria-hidden
    />
  ) : null;

  const handleError = useCallback(() => setFailedVideo(video), [video]);

  useEffect(() => {
    if (videoFailed) return;
    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;
    let removeGestureListeners: (() => void) | null = null;

    const onGesture = () => {
      if (cancelled) return;
      void el.play().catch((err) => {
        console.warn("[pb-runtime-react] Background video gesture play failed", err);
      });
    };

    const armGestureRetry = () => {
      const opts: AddEventListenerOptions = { once: true, passive: true };
      window.addEventListener("pointerdown", onGesture, opts);
      window.addEventListener("touchstart", onGesture, opts);
      window.addEventListener("keydown", onGesture, { once: true });
      removeGestureListeners = () => {
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("touchstart", onGesture);
        window.removeEventListener("keydown", onGesture);
      };
    };

    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch((err) => {
        if (!cancelled) {
          console.warn("[pb-runtime-react] Background video initial play failed", err);
          armGestureRetry();
        }
      });
    }

    return () => {
      cancelled = true;
      removeGestureListeners?.();
      el.pause();
    };
  }, [video, videoFailed]);

  useEffect(() => {
    if (videoFailed) return;
    const el = videoRef.current;
    if (!el) return;

    const sync = () => {
      if (document.hidden) {
        if (!el.paused) el.pause();
      } else if (el.paused) {
        void el.play().catch((err) => {
          console.warn("[pb-runtime-react] Background video visibility resume failed", err);
        });
      }
    };

    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [videoFailed]);

  if (videoFailed && poster) {
    return (
      <section className={SECTION_CLASS} aria-hidden>
        <div className="absolute inset-0 h-full w-full" aria-hidden>
          <Image
            src={poster}
            alt=""
            fill
            priority={priority}
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        {overlayEl}
      </section>
    );
  }

  return (
    <section className={SECTION_CLASS} aria-hidden>
      {poster && !hasPlayed && (
        <Image
          src={poster}
          alt=""
          fill
          priority={priority}
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      )}
      <video
        ref={videoRef}
        src={video}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        width={16}
        height={9}
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nodownload nofullscreen noremoteplayback"
        draggable={false}
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 h-full w-full object-cover object-center"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onError={handleError}
        onPlaying={handlePlaying}
      />
      {overlayEl}
    </section>
  );
}
