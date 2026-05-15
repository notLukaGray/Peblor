"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { UseVideoControlsResult } from "@/peblor/hooks/use-video-controls";

export type ElementVideoCoreProps = {
  setVideoRef: (el: HTMLVideoElement | null) => void;
  shouldLoad: boolean;
  poster?: string;
  ariaLabel?: string;
  videoStyle: CSSProperties;
  withModule: boolean;
  controls: UseVideoControlsResult;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  playbackRate?: number;
  priority?: boolean;
  preload?: "none" | "metadata" | "auto";
  crossOrigin?: "anonymous" | "use-credentials";
  controlsList?: string;
};

const DEFAULT_CONTROLS_LIST = "nodownload nofullscreen";
const BASE_VIDEO_WRAPPER_STYLE: CSSProperties = { position: "relative", width: "100%" };
const MODULE_VIDEO_WRAPPER_STYLE: CSSProperties = {
  ...BASE_VIDEO_WRAPPER_STYLE,
  height: "100%",
  minWidth: 0,
  minHeight: 0,
};

function isIosLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function resolveControlsList(controlsList?: string): string {
  if (controlsList != null) return controlsList;
  return isIosLikeDevice() ? "nodownload" : DEFAULT_CONTROLS_LIST;
}

export function ElementVideoCore({
  setVideoRef,
  shouldLoad,
  poster,
  ariaLabel,
  videoStyle,
  withModule,
  controls,
  autoplay,
  loop,
  muted,
  playbackRate,
  priority,
  preload,
  crossOrigin,
  controlsList,
}: ElementVideoCoreProps) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const resolvedControlsList = resolveControlsList(controlsList);
  const [hasPlayed, setHasPlayed] = useState(false);

  const handleVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoElRef.current = el;
      setVideoRef(el);
    },
    [setVideoRef]
  );

  useEffect(() => {
    if (!videoElRef.current || playbackRate == null) return;
    videoElRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const resolvedPoster = shouldLoad ? (poster ?? undefined) : undefined;
  const disableRemotePlayback = controlsList?.split(/\s+/).includes("noremoteplayback");

  return (
    <div style={withModule ? MODULE_VIDEO_WRAPPER_STYLE : BASE_VIDEO_WRAPPER_STYLE}>
      {priority && resolvedPoster && !hasPlayed && (
        // React 19 hoists this to <head> during SSR so the poster is discovered before JS runs.
        <link rel="preload" as="image" href={resolvedPoster} fetchPriority="high" />
      )}
      {resolvedPoster && !hasPlayed && (
        <Image
          src={resolvedPoster}
          alt=""
          fill
          priority={priority}
          className="absolute inset-0 object-cover"
        />
      )}
      <video
        ref={handleVideoRef}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        playsInline
        preload={shouldLoad ? (preload ?? "metadata") : "none"}
        crossOrigin={crossOrigin}
        controls={!withModule}
        disableRemotePlayback={disableRemotePlayback || undefined}
        controlsList={resolvedControlsList}
        style={{
          ...videoStyle,
          ...(withModule ? { width: "100%", height: "100%" } : {}),
        }}
        onPlay={controls.handlePlay}
        onPause={controls.handlePause}
        onEnded={controls.handleEnded}
        onVolumeChange={controls.handleVolumeChange}
        onLoadedData={controls.handleVolumeChange}
        onTimeUpdate={controls.onTimeUpdate}
        onLoadedMetadata={controls.onLoadedMetadata}
        onPlaying={() => setHasPlayed(true)}
        aria-label={ariaLabel || "Video"}
      />
    </div>
  );
}
