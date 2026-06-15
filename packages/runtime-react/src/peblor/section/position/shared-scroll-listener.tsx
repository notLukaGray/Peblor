"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

type ScrollCallback = (scrollY: number, direction: "up" | "down") => void;

type SharedScrollContextValue = {
  subscribe: (cb: ScrollCallback) => () => void;
};

const SharedScrollContext = createContext<SharedScrollContextValue | null>(null);

export function useSharedScroll(): SharedScrollContextValue {
  const ctx = useContext(SharedScrollContext);
  if (ctx) return ctx;

  // Fallback when no provider exists (tests, edge cases) — each call gets its own
  // window scroll listener. The shared provider is a perf optimization, not a
  // correctness requirement.
  return {
    subscribe: (cb) => {
      let lastY = window.scrollY;
      const handler = () => {
        const sy = window.scrollY;
        const dir: "up" | "down" = sy >= lastY ? "down" : "up";
        lastY = sy;
        cb(sy, dir);
      };
      window.addEventListener("scroll", handler, { passive: true });
      return () => window.removeEventListener("scroll", handler);
    },
  };
}

export function SharedScrollListenerProvider({
  children,
  scrollContainerRef,
}: {
  children: ReactNode;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}) {
  const subscribers = useRef(new Set<ScrollCallback>());
  const lastScrollY = useRef(0);

  useEffect(() => {
    const getScrollY = () =>
      scrollContainerRef.current ? scrollContainerRef.current.scrollTop : window.scrollY;

    const handleScroll = () => {
      const scrollY = getScrollY();
      const direction: "up" | "down" = scrollY >= lastScrollY.current ? "down" : "up";
      lastScrollY.current = scrollY;
      for (const cb of subscribers.current) cb(scrollY, direction);
    };

    const target = scrollContainerRef.current ?? window;
    target.addEventListener("scroll", handleScroll, { passive: true });
    return () => target.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef]);

  const value: SharedScrollContextValue = {
    subscribe: (cb) => {
      subscribers.current.add(cb);
      return () => {
        subscribers.current.delete(cb);
      };
    },
  };

  return <SharedScrollContext.Provider value={value}>{children}</SharedScrollContext.Provider>;
}
