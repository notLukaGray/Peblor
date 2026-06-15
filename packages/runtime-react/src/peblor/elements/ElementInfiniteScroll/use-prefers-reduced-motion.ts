"use client";

import { useEffect, useState } from "react";

function getInitialPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    update();
    mediaQuery.addEventListener?.("change", update);
    mediaQuery.addListener?.(update);

    return () => {
      mediaQuery.removeEventListener?.("change", update);
      mediaQuery.removeListener?.(update);
    };
  }, []);

  return prefersReducedMotion;
}
