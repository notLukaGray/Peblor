"use client";

import { useEffect } from "react";
import { useAfterLcp } from "@pb/runtime-react/core/hooks/use-after-lcp";
import { preloadModel3DGLTF } from "./model3d-use-gltf";

/**
 * Preloads GLB geometry into drei's cache.
 * Only runs while `enabled` is true (caller should pass mounted/loaded state)
 * so we avoid caching GLTFs with blob texture URLs before the canvas exists.
 */
export function useModel3DPreload(
  geometryUrls: string[],
  options?: { eager?: boolean; enabled?: boolean }
) {
  const isAfterLcp = useAfterLcp();
  const enabled = options?.enabled !== false;
  const shouldPreload = enabled && (options?.eager === true || isAfterLcp);

  useEffect(() => {
    if (!shouldPreload || geometryUrls.length === 0) return;

    const preload = () => {
      geometryUrls.forEach((url) => preloadModel3DGLTF(url));
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = requestIdleCallback(preload);
      return () => cancelIdleCallback(id);
    }

    preload();
    return;
  }, [geometryUrls, shouldPreload]);
}
