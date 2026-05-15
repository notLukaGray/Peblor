"use client";

import { useEffect, useState, useMemo } from "react";
import { parseCssValueToPixels } from "@pb/core/layout";
import { useScrollContainer } from "@/peblor/section/position/use-scroll-container";

type UseStickyPositioningProps = {
  sectionRef: React.RefObject<HTMLElement | null>;
  placeholderRef: React.RefObject<HTMLDivElement | null>;
  stickyOffset?: string;
  stickyPosition?: "top" | "bottom";
  hasInitialPosition: boolean;
};

export function useStickyPositioning({
  sectionRef,
  placeholderRef,
  stickyOffset = "0px",
  stickyPosition = "top",
  hasInitialPosition,
}: UseStickyPositioningProps) {
  const [isSticky, setIsSticky] = useState(false);
  const container = useScrollContainer();

  const stickyOffsetPixels = useMemo(() => {
    if (!stickyOffset) return 0;
    return parseCssValueToPixels(stickyOffset, true) ?? 0;
  }, [stickyOffset]);

  useEffect(() => {
    if (!container || hasInitialPosition) {
      Promise.resolve().then(() => setIsSticky(false));
      return;
    }

    let rafId: number | null = null;

    const updateSticky = () => {
      if (!sectionRef.current || !placeholderRef.current) return;

      const containerRect = container.getBoundingClientRect();
      const placeholderRect = placeholderRef.current.getBoundingClientRect();

      // Sticky when the placeholder has scrolled to/past the stick line (offset from container edge).
      const shouldBeSticky =
        stickyPosition === "bottom"
          ? placeholderRect.bottom >= containerRect.bottom - stickyOffsetPixels
          : placeholderRect.top - containerRect.top <= stickyOffsetPixels;
      setIsSticky(shouldBeSticky);
    };

    const handleScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          updateSticky();
          rafId = null;
        });
      }
    };

    let initTimeout: NodeJS.Timeout | null = null;
    initTimeout = setTimeout(() => {
      updateSticky();
      initTimeout = null;
    }, 0);

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      if (initTimeout !== null) {
        clearTimeout(initTimeout);
      }
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [
    container,
    hasInitialPosition,
    stickyOffsetPixels,
    stickyPosition,
    placeholderRef,
    sectionRef,
  ]);

  return {
    isSticky,
    stickyOffsetPixels,
  };
}
