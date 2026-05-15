"use client";

import type * as THREE from "three";
import { useVideoTexture } from "./use-video-texture";
import type {
  UseVideoTextureProps,
  VideoTextureProviderProps,
  VideoTextureProviderReturn,
} from "./video-texture-types";

export type { VideoTextureProviderProps, VideoTextureProviderReturn };

export function VideoTextureProvider({
  videoPath,
  loop = true,
  muted = true,
  autoplay = true,
  sharpText = false,
  useAsAlphaMap = false,
  version,
  children,
}: VideoTextureProviderProps) {
  const videoTexture = useVideoTexture({
    videoPath,
    loop,
    muted,
    autoplay,
    sharpText,
    useAsAlphaMap,
    version,
  });
  return <>{children(videoTexture)}</>;
}

export function useVideoAlphaMap(props: Omit<UseVideoTextureProps, "useAsAlphaMap">) {
  const result = useVideoTexture({ ...props, useAsAlphaMap: true });
  return {
    alphaMapTexture: result.texture,
    alphaMapReady: result.textureReady,
    textureVersion: result.textureVersion,
  };
}

export function VideoAlphaMapProvider(
  props: Omit<VideoTextureProviderProps, "useAsAlphaMap"> & {
    children: (props: {
      alphaMapTexture: THREE.Texture | null;
      alphaMapReady: boolean;
      textureVersion: number;
    }) => React.ReactNode;
  }
) {
  return (
    <VideoTextureProvider {...props} useAsAlphaMap={true}>
      {({ texture, textureReady, textureVersion }) =>
        props.children({
          alphaMapTexture: texture,
          alphaMapReady: textureReady,
          textureVersion,
        })
      }
    </VideoTextureProvider>
  );
}
