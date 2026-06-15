"use client";

import { useGLTF } from "@react-three/drei";
import type { GLTFLoader } from "three-stdlib";

export type Model3DGLTFDecodeOptions = {
  draco?: boolean;
  meshopt?: boolean;
};

function gltfResourcePath(url: string): string {
  const lastSlash = url.lastIndexOf("/");
  return lastSlash >= 0 ? url.slice(0, lastSlash + 1) : "";
}

/** Configure loader for cross-origin CDN assets and correct relative texture paths. */
export function configureModel3DGLTFLoader(loader: GLTFLoader, url: string): void {
  loader.setCrossOrigin("anonymous");
  const resourcePath = gltfResourcePath(url);
  if (resourcePath) loader.setResourcePath(resourcePath);

  const manager = loader.manager;
  if (manager && typeof manager.setURLModifier === "function") {
    manager.setURLModifier((resourceUrl) => {
      if (
        resourceUrl.startsWith("http://") ||
        resourceUrl.startsWith("https://") ||
        resourceUrl.startsWith("data:") ||
        resourceUrl.startsWith("blob:")
      ) {
        return resourceUrl;
      }
      if (resourceUrl.startsWith("/")) return resourceUrl;
      return `${resourcePath}${resourceUrl}`;
    });
  }
}

export function useModel3DGLTF(url: string, decode: Model3DGLTFDecodeOptions = {}) {
  const useDraco = decode.draco ?? true;
  const useMeshopt = decode.meshopt ?? true;
  return useGLTF(url, useDraco, useMeshopt, (loader) => configureModel3DGLTFLoader(loader, url));
}

export function preloadModel3DGLTF(url: string, decode: Model3DGLTFDecodeOptions = {}): void {
  if (!url) return;
  const useDraco = decode.draco ?? true;
  const useMeshopt = decode.meshopt ?? true;
  useGLTF.preload(url, useDraco, useMeshopt, (loader) => configureModel3DGLTFLoader(loader, url));
}

export function clearModel3DGLTFCache(urls: string[]): void {
  for (const url of urls) {
    if (url) useGLTF.clear(url);
  }
}
