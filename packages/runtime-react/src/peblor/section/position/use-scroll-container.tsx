"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

type ScrollContainerContextValue = {
  containerRef: RefObject<HTMLElement | null>;
  scrollTopRef: { current: number };
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
  const scrollTopRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeContainer = container;

    function updateScrollTop() {
      scrollTopRef.current = activeContainer.scrollTop;
    }

    updateScrollTop();
    activeContainer.addEventListener("scroll", updateScrollTop, { passive: true });
    return () => activeContainer.removeEventListener("scroll", updateScrollTop);
  }, [containerRef]);

  const contextValue = useMemo(
    () => ({ containerRef, scrollTopRef }),
    // containerRef and scrollTopRef are refs — their object identity is stable for the
    // provider's lifetime, so this memo effectively runs once per mount.

    [containerRef]
  );

  return (
    <ScrollContainerContext.Provider value={contextValue}>
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

/** Latest scrollTop from context without reading layout in hot paths. */
export function useScrollContainerScrollTopRef(): { current: number } | null {
  const context = useContext(ScrollContainerContext);
  return context?.scrollTopRef ?? null;
}
