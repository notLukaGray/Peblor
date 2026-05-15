"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { useVideoTexture } from "./video-texture";
import type { TextureDef } from "@pb/contracts/types";
import { type Texture } from "three";

export const PLACEHOLDER_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** Ensure asset source is a loadable URL. Server sends proxy path; API redirects to signed CDN URL. */
export function resolveModel3DAssetPath(
  source: string | null | undefined,
  options: { raw?: boolean } = {}
): string {
  if (!source || typeof source !== "string") return "";
  const s = source.trim();
  if (!s) return "";
  if (
    s.startsWith("data:") ||
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("/")
  )
    return s;
  const path = s
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `/api/media/${path}${options.raw ? "?raw=1" : ""}`;
}

export function useTextureMap(textures: Record<string, TextureDef> | undefined) {
  const imageEntries = useMemo(
    () => (textures ? Object.entries(textures).filter(([, v]) => v.type === "image") : []),
    [textures]
  );
  const imageUrls = useMemo(() => {
    if (!imageEntries.length) return [PLACEHOLDER_IMAGE];
    return imageEntries.map(([, v]) => {
      const source = (v as { source?: string }).source;
      const resolved = resolveModel3DAssetPath(source, { raw: true });
      return resolved !== "" ? resolved : PLACEHOLDER_IMAGE;
    });
  }, [imageEntries]);
  const imageTextureList = useTexture(imageUrls);

  const videoEntry = useMemo(
    () => (textures ? Object.entries(textures).find(([, v]) => v.type === "video") : null),
    [textures]
  );
  const rawVideoSource = videoEntry
    ? (
        videoEntry[1] as {
          source: string;
          loop?: boolean;
          muted?: boolean;
          useAsAlphaMap?: boolean;
        }
      ).source
    : null;
  const videoSource = useMemo(() => resolveModel3DAssetPath(rawVideoSource), [rawVideoSource]);
  const videoOpts = videoEntry
    ? (videoEntry[1] as {
        source: string;
        loop?: boolean;
        muted?: boolean;
        useAsAlphaMap?: boolean;
      })
    : null;
  const videoTextureResult = useVideoTexture({
    videoPath: videoSource,
    loop: videoOpts?.loop ?? true,
    muted: videoOpts?.muted ?? true,
    useAsAlphaMap: videoOpts?.useAsAlphaMap ?? false,
    sharpText: true,
  });

  const textureMap = useMemo(() => {
    const map = new Map<string, Texture>();
    imageEntries.forEach(([key], i) => {
      if (imageTextureList[i]) map.set(key, imageTextureList[i]);
    });
    if (videoTextureResult.texture && videoTextureResult.textureReady && videoEntry) {
      map.set(videoEntry[0], videoTextureResult.texture);
    }
    return map;
  }, [
    imageEntries,
    imageTextureList,
    videoEntry,
    videoTextureResult.texture,
    videoTextureResult.textureReady,
  ]);

  const videoReady = !videoEntry || videoTextureResult.textureReady;
  const videoElement = useMemo(() => {
    const texture = videoTextureResult?.texture;
    const image = texture?.image;
    if (typeof HTMLVideoElement === "undefined") return null;
    return image instanceof HTMLVideoElement ? image : null;
  }, [videoTextureResult?.texture]);

  return { textureMap, videoReady, videoElement };
}
