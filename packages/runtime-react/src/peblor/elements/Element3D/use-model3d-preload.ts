"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useAfterLcp } from "@pb/runtime-react/core/hooks/use-after-lcp";

/**
 * Preloads GLB geometry files into drei's cache on idle.
 * By default this waits until after LCP; homepage-priority scenes can opt in earlier.
 */
export function useModel3DPreload(geometryUrls: string[], options?: { eager?: boolean }) {
  const isAfterLcp = useAfterLcp();
  const shouldPreload = options?.eager === true || isAfterLcp;

  useEffect(() => {
    if (!shouldPreload || geometryUrls.length === 0) return;

    const preload = () => {
      geometryUrls.forEach((url) => {
        if (url) useGLTF.preload(url);
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = requestIdleCallback(preload);
      return () => cancelIdleCallback(id);
    }

    preload();
    return;
  }, [geometryUrls, shouldPreload]);
}
