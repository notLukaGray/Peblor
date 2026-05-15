"use client";

import { useSyncExternalStore } from "react";
import type { PeblorThemeMode } from "./theme-string";

const themeModeListeners = new Set<() => void>();
let themeModeObserver: MutationObserver | null = null;
let themeModeStorageListener: ((event: StorageEvent) => void) | null = null;

function readThemeMode(): PeblorThemeMode {
  if (typeof document === "undefined") return "dark";
  const root = document.documentElement;
  const forcedTheme = root.dataset.pbForcedTheme;
  if (forcedTheme === "light" || forcedTheme === "dark") return forcedTheme;
  return root.classList.contains("dark") ? "dark" : "light";
}

function subscribe(callback: () => void): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") return () => {};
  themeModeListeners.add(callback);

  if (themeModeObserver == null) {
    const root = document.documentElement;
    themeModeObserver = new MutationObserver(() => {
      for (const listener of themeModeListeners) listener();
    });
    themeModeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-pb-forced-theme"],
    });
  }

  if (themeModeStorageListener == null) {
    themeModeStorageListener = (event: StorageEvent) => {
      if (event.key !== "theme") return;
      for (const listener of themeModeListeners) listener();
    };
    window.addEventListener("storage", themeModeStorageListener);
  }

  return () => {
    themeModeListeners.delete(callback);
    if (themeModeListeners.size > 0) return;
    themeModeObserver?.disconnect();
    themeModeObserver = null;
    if (themeModeStorageListener) {
      window.removeEventListener("storage", themeModeStorageListener);
      themeModeStorageListener = null;
    }
  };
}

export function usePeblorThemeMode(): PeblorThemeMode {
  return useSyncExternalStore(subscribe, readThemeMode, () => "dark");
}
