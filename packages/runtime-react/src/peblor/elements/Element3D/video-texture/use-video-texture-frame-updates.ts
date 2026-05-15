import { useEffect } from "react";
import type * as THREE from "three";

export function useVideoTextureFrameUpdates(args: {
  textureRef: React.MutableRefObject<THREE.VideoTexture | null>;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  textureReady: boolean;
}) {
  const { textureRef, videoRef, textureReady } = args;

  useEffect(() => {
    if (!textureRef.current || !videoRef.current || !textureReady) return;

    const video = videoRef.current;
    let animationFrameId = 0;

    const loop = () => {
      if (!textureRef.current) return;
      textureRef.current.needsUpdate = true;
      animationFrameId = requestAnimationFrame(loop);
    };

    const onPlay = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(loop);
    };

    const onPause = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
      // Mark one final update so the paused frame is flushed to the texture.
      if (textureRef.current) textureRef.current.needsUpdate = true;
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    // Start immediately if the video is already playing.
    if (!video.paused) {
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [textureReady, textureRef, videoRef]);
}
