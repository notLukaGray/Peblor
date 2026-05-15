"use client";

import { useEffect, useState } from "react";

type UseAfterLcpOptions = {
  fallbackMs?: number;
};

let globalLatched = false;
const listeners = new Set<() => void>();

let watchStarted = false;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
let observer: PerformanceObserver | null = null;
let loadListener: (() => void) | null = null;

function fireAll() {
  if (globalLatched) return;
  globalLatched = true;

  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
  observer?.disconnect();
  observer = null;
  if (loadListener) {
    window.removeEventListener("load", loadListener);
    loadListener = null;
  }

  const snapshot = [...listeners];
  listeners.clear();

  requestAnimationFrame(() => {
    for (const fn of snapshot) {
      try {
        fn();
      } catch {
        /* ignore stale listener */
      }
    }
  });
}

function startWatch(fallbackMs: number) {
  if (typeof window === "undefined" || watchStarted) return;
  watchStarted = true;

  fallbackTimer = setTimeout(fireAll, fallbackMs);

  try {
    if ("PerformanceObserver" in window) {
      observer = new PerformanceObserver((list) => {
        if (list.getEntries().length > 0) {
          fireAll();
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    }
  } catch {
    /* rely on fallback / load */
  }

  loadListener = () => fireAll();
  window.addEventListener("load", loadListener, { once: true });
  if (document.readyState === "complete") {
    fireAll();
  }
}

/**
 * Returns true once the page has produced an LCP entry (or after a fallback timeout).
 * Used to defer non-critical work until after the initial paint settles.
 *
 * All callers share a single PerformanceObserver + fallback timer (first `fallbackMs` wins).
 */
export function useAfterLcp({ fallbackMs = 4000 }: UseAfterLcpOptions = {}): boolean {
  const [isAfterLcp, setIsAfterLcp] = useState(() => globalLatched);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (globalLatched) {
      requestAnimationFrame(() => setIsAfterLcp(true));
      return;
    }

    const onLcp = () => setIsAfterLcp(true);
    listeners.add(onLcp);
    startWatch(fallbackMs);

    return () => {
      listeners.delete(onLcp);
    };
  }, [fallbackMs]);

  return isAfterLcp;
}
