import type * as THREE from "three";

export interface VideoTextureOptions {
  sharpText?: boolean;
  useAsAlphaMap?: boolean;
}

export interface UseVideoTextureProps {
  videoPath: string;
  loop?: boolean;
  muted?: boolean;
  autoplay?: boolean;
  sharpText?: boolean;
  useAsAlphaMap?: boolean;
  version?: string | number;
}

export type VideoTextureHookResult = {
  texture: THREE.VideoTexture | null;
  textureReady: boolean;
  textureVersion: number;
};

export type VideoTextureProviderReturn = VideoTextureHookResult;

export interface VideoTextureProviderProps extends UseVideoTextureProps {
  children: (props: VideoTextureProviderReturn) => React.ReactNode;
}
