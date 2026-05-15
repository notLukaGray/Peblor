"use client";

import { useEffect, useRef } from "react";
import type { PageScrollConfig } from "@pb/contracts/types";
import { useSmoothScroll } from "@pb/runtime-react/core/hooks/use-smooth-scroll";
import { ScrollContainerProvider, useScrollContainerRef } from "./use-scroll-container";

/**
 * Applies page-level scroll behavior from the page schema's `scroll` field.
 * Reuses an existing scroll container from context when present (route layout),
 * otherwise creates one and provides ScrollContainerProvider.
 *
 * Reuses useSmoothScroll (from core/hooks). Scroll-lock runs in an effect below
 * with an `lockBody` guard so hooks stay unconditional.
 */
export function PageScrollProvider({
  scroll,
  children,
}: {
  scroll: PageScrollConfig;
  children: React.ReactNode;
}) {
  const smooth = scroll.smooth ?? false;
  const lockBody = scroll.lockBody ?? false;
  const overflowX = scroll.overflowX ?? "hidden";
  const overflowY = scroll.overflowY ?? "auto";
  const snapType = scroll.snapType;

  const inheritedScrollRef =
    useScrollContainerRef() as React.RefObject<HTMLDivElement | null> | null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeScrollRef = inheritedScrollRef ?? scrollRef;

  // Scroll-lock: html/body overflow hidden when lockBody; restore on cleanup.
  useEffect(() => {
    if (!lockBody) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [lockBody]);

  // Smooth scroll: useSmoothScroll intercepts wheel events and must only be
  // active when smooth is true. We always call it but pass a ref that points
  // at null when disabled so the effect finds no element and exits immediately.
  const noopRef = useRef<HTMLDivElement>(null);
  useSmoothScroll(smooth ? activeScrollRef : noopRef);

  // Apply configured overflow semantics even when using an inherited container.
  useEffect(() => {
    const el = activeScrollRef.current;
    if (!el) return;
    const prevOverflowX = el.style.overflowX;
    const prevOverflowY = el.style.overflowY;
    const prevSnapType = el.style.scrollSnapType;
    el.style.overflowX = overflowX;
    el.style.overflowY = overflowY;
    if (snapType) {
      el.style.scrollSnapType = snapType;
    } else {
      el.style.removeProperty("scroll-snap-type");
    }
    return () => {
      el.style.overflowX = prevOverflowX;
      el.style.overflowY = prevOverflowY;
      el.style.scrollSnapType = prevSnapType;
    };
  }, [activeScrollRef, overflowX, overflowY, snapType]);

  const overflowXClass =
    overflowX === "hidden"
      ? "overflow-x-hidden"
      : overflowX === "auto"
        ? "overflow-x-auto"
        : "overflow-x-visible";

  const overflowYClass =
    overflowY === "auto"
      ? "overflow-y-auto"
      : overflowY === "scroll"
        ? "overflow-y-scroll"
        : "overflow-y-hidden";

  if (inheritedScrollRef) {
    return <>{children}</>;
  }

  return (
    <ScrollContainerProvider containerRef={scrollRef}>
      <div
        ref={scrollRef}
        className={`work-scroll relative h-dvh w-full min-w-0 ${overflowYClass} ${overflowXClass}`}
      >
        {children}
      </div>
    </ScrollContainerProvider>
  );
}
