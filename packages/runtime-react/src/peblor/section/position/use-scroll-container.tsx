"use client";

import { createContext, useContext, type ReactNode, type RefObject } from "react";

type ScrollContainerContextValue = {
  containerRef: RefObject<HTMLElement | null>;
};

const ScrollContainerContext = createContext<ScrollContainerContextValue | null>(null);

/** Provides scroll container ref for section components. */
export function ScrollContainerProvider({
  children,
  containerRef,
}: {
  children: ReactNode;
  containerRef: RefObject<HTMLElement | null>;
}) {
  return (
    <ScrollContainerContext.Provider value={{ containerRef }}>
      {children}
    </ScrollContainerContext.Provider>
  );
}

/** Scroll container from context. */
export function useScrollContainer(): HTMLElement | null {
  const context = useContext(ScrollContainerContext);
  return context?.containerRef.current ?? null;
}

/** Scroll container ref from context (for Framer Motion useScroll container option). */
export function useScrollContainerRef(): RefObject<HTMLElement | null> | null {
  const context = useContext(ScrollContainerContext);
  return context?.containerRef ?? null;
}
