"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { type VideoTexture } from "three";
import { useAfterLcp } from "@pb/runtime-react/core/hooks/use-after-lcp";
import {
  buildVideoTextureUrl,
  createVideoTexture,
  disposeTexture,
  getVideoCrossOrigin,
} from "./video-texture-core";
import { useVideoTextureFrameUpdates } from "./use-video-texture-frame-updates";
import type { UseVideoTextureProps, VideoTextureHookResult } from "./video-texture-types";

export function useVideoTexture({
  videoPath,
  loop = true,
  muted = true,
  autoplay = true,
  sharpText = false,
  useAsAlphaMap = false,
  version,
}: UseVideoTextureProps): VideoTextureHookResult {
  const isAfterLcp = useAfterLcp();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureRef = useRef<VideoTexture | null>(null);
  const textureCreatedRef = useRef(false);
  const [textureReady, setTextureReady] = useState(false);
  const [textureVersion, setTextureVersion] = useState(0);
  const [texture, setTextureState] = useState<VideoTexture | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !videoPath || !isAfterLcp) {
      startTransition(() => {
        setTextureReady(false);
        setTextureState(null);
      });
      return;
    }

    textureCreatedRef.current = false;
    startTransition(() => {
      setTextureReady(false);
      setTextureState(null);
    });

    const video = document.createElement("video");
    const finalUrl = buildVideoTextureUrl(videoPath, version);
    video.src = finalUrl;
    video.loop = loop;
    video.muted = muted;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = getVideoCrossOrigin(finalUrl);

    const createTextureFromVideo = () => {
      if (textureCreatedRef.current || textureRef.current) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const tex = createVideoTexture(video, { sharpText, useAsAlphaMap });
      tex.needsUpdate = true;
      textureRef.current = tex;
      videoRef.current = video;
      textureCreatedRef.current = true;
      setTextureState(tex);

      if (autoplay)
        video.play().catch((err) => {
          console.warn("[pb-runtime-react] Video texture autoplay failed", err);
        });
      setTextureReady(true);
      setTextureVersion((prev) => prev + 1);
    };

    let pollId: ReturnType<typeof setTimeout> | undefined;
    const startDimensionPoll = () => {
      const poll = () => {
        if (textureCreatedRef.current || textureRef.current) return;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          createTextureFromVideo();
          return;
        }
        pollId = setTimeout(poll, 60);
      };
      pollId = setTimeout(poll, 0);
    };

    const handleCanPlay = () => createTextureFromVideo();
    const handleLoadedMetaOrData = () => {
      createTextureFromVideo();
      startDimensionPoll();
    };
    const handleError = () => {
      setTextureReady(false);
      setTextureState(null);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadedmetadata", handleLoadedMetaOrData);
    video.addEventListener("loadeddata", handleLoadedMetaOrData);
    video.addEventListener("error", handleError);
    video.load();

    return () => {
      if (pollId !== undefined) clearTimeout(pollId);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadedmetadata", handleLoadedMetaOrData);
      video.removeEventListener("loadeddata", handleLoadedMetaOrData);
      video.removeEventListener("error", handleError);
      video.pause();
      video.src = "";
      video.load();

      disposeTexture(textureRef.current);
      textureRef.current = null;
      videoRef.current = null;
      textureCreatedRef.current = false;
      setTextureState(null);
      setTextureReady(false);
    };
  }, [videoPath, loop, muted, autoplay, sharpText, useAsAlphaMap, version, isAfterLcp]);

  useVideoTextureFrameUpdates({ textureRef, videoRef, textureReady });

  return { texture, textureReady, textureVersion };
}
