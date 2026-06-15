"use client";

import { createContext, useContext, type ReactNode } from "react";

type SmoothScrollToFn = (top: number) => void;

const SmoothScrollToContext = createContext<SmoothScrollToFn | null>(null);

/**
 * Provides a programmatic smooth-scroll function driven by the lerp rAF loop.
 * Only rendered when `scroll.smooth` is true so callers can use `null` as a sentinel
 * to fall back to native scrollIntoView.
 */
export function SmoothScrollToProvider({
  scrollTo,
  children,
}: {
  scrollTo: SmoothScrollToFn;
  children: ReactNode;
}) {
  return (
    <SmoothScrollToContext.Provider value={scrollTo}>{children}</SmoothScrollToContext.Provider>
  );
}

/**
 * Returns the lerp-based scrollTo function when the page has smooth scroll active,
 * or null when native scroll (scrollIntoView) should be used instead.
 */
export function useSmoothScrollTo(): SmoothScrollToFn | null {
  return useContext(SmoothScrollToContext);
}
