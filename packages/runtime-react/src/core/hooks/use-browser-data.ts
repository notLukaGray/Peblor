"use client";

import { useSyncExternalStore } from "react";

export type BrowserData = {
  viewportWidthPx: number;
  viewportHeightPx: number;
  devicePixelRatio: number;
};

function getWindowBrowserData(): BrowserData | null {
  if (typeof window === "undefined") return null;

  const vv = window.visualViewport;
  const width = vv?.width ?? window.innerWidth;
  const height = vv?.height ?? window.innerHeight;
  const dprRaw = Number(window.devicePixelRatio);
  const devicePixelRatio =
    Number.isFinite(dprRaw) && dprRaw > 0 ? Math.round(dprRaw * 100) / 100 : 1;

  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return {
    viewportWidthPx: Math.max(0, Math.round(width)),
    viewportHeightPx: Math.max(0, Math.round(height)),
    devicePixelRatio,
  };
}

type Listener = () => void;

const browserDataStore = (() => {
  let current: BrowserData | null = null;
  const listeners = new Set<Listener>();
  let detach: (() => void) | null = null;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const update = () => {
    const next = getWindowBrowserData();
    if (next == null && current == null) return;
    if (
      next != null &&
      current?.viewportWidthPx === next.viewportWidthPx &&
      current?.viewportHeightPx === next.viewportHeightPx &&
      current?.devicePixelRatio === next.devicePixelRatio
    ) {
      return;
    }
    current = next;
    emit();
  };

  const ensureListening = () => {
    if (typeof window === "undefined") return;
    if ((window as unknown as Record<string, boolean | undefined>).__pbBrowserDataListening) return;
    (window as unknown as Record<string, boolean | undefined>).__pbBrowserDataListening = true;
    if (detach != null) return;
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    update();
    detach = () => {
      (window as unknown as Record<string, boolean | undefined>).__pbBrowserDataListening = false;
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
      listeners.clear();
      detach = null;
    };
  };

  return {
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      ensureListening();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) detach?.();
      };
    },
    getSnapshot(): BrowserData | null {
      return current;
    },
    getServerSnapshot(): BrowserData | null {
      return null;
    },
  };
})();

export function useBrowserData(): BrowserData | null {
  return useSyncExternalStore(
    browserDataStore.subscribe,
    browserDataStore.getSnapshot,
    browserDataStore.getServerSnapshot
  );
}
