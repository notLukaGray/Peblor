"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { createElement } from "react";
import type { bgBlock } from "@pb/contracts/types";
import { BG_COMPONENTS, isKnownBgType } from "./index";
import { useScrollContainerRef } from "@/peblor/section/position/use-scroll-container";
import { useScroll, useMotionValueEvent } from "@/peblor/integrations/framer-motion";

type BgBlockTransition = Extract<bgBlock, { type: "backgroundTransition" }>;

type PureProps = {
  from: BgBlockTransition["from"];
  to: BgBlockTransition["to"];
  progress: number;
  transitionStyle: React.CSSProperties;
};

export function BackgroundTransitionPure({ from, to, progress, transitionStyle }: PureProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const fromOpacity = 1 - clamped;
  const toOpacity = clamped;

  const FromComponent = useMemo(() => {
    if (
      !from ||
      typeof from !== "object" ||
      !("type" in from) ||
      typeof from.type !== "string" ||
      !isKnownBgType(from.type)
    )
      return null;
    return BG_COMPONENTS[from.type];
  }, [from]);

  const ToComponent = useMemo(() => {
    if (
      !to ||
      typeof to !== "object" ||
      !("type" in to) ||
      typeof to.type !== "string" ||
      !isKnownBgType(to.type)
    )
      return null;
    return BG_COMPONENTS[to.type];
  }, [to]);

  const containerProps = useMemo(
    () => ({
      className: "pointer-events-none fixed inset-0 z-[var(--pb-z-base)]",
      "aria-hidden": true as const,
    }),
    []
  );

  if (!FromComponent || !ToComponent) {
    if (FromComponent)
      return <section {...containerProps}>{createElement(FromComponent, from as bgBlock)}</section>;
    if (ToComponent)
      return <section {...containerProps}>{createElement(ToComponent, to as bgBlock)}</section>;
    return null;
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: fromOpacity,
          ...transitionStyle,
        }}
        aria-hidden
      >
        {createElement(FromComponent, from as bgBlock)}
      </div>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: toOpacity,
          ...transitionStyle,
        }}
        aria-hidden
      >
        {createElement(ToComponent, to as bgBlock)}
      </div>
    </>
  );
}

function mapProgressThroughRange(
  raw: number,
  range: { start: number; end: number } | undefined
): number {
  const p = Math.max(0, Math.min(1, raw));
  if (!range) return p;
  const { start, end } = range;
  if (p <= start) return 0;
  if (p >= end) return 1;
  const r = end - start;
  return r > 0 ? (p - start) / r : 0;
}

export function BackgroundTransition(props: BgBlockTransition) {
  const {
    from,
    to,
    duration,
    easing = "ease-in-out",
    mode,
    progress,
    progressRange,
    position,
    time,
  } = props;

  // ── Scroll container ─────────────────────────────────────────────────────────
  // Use the ref object (not .current) so FM can handle deferred DOM mounting.
  // Reading containerRef.current at render time returns null before the container
  // mounts, which breaks manual event-listener subscriptions. FM's useScroll
  // internally watches for the ref to populate, so it works correctly even on
  // the initial render.
  const containerRef = useScrollContainerRef();

  const [positionTriggered, setPositionTriggered] = useState(false);
  const [transitionStarted, setTransitionStarted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const hasTriggeredRef = useRef(false);

  const transitionMode = useMemo(
    () => mode ?? (progressRange ? "progress" : "time"),
    [mode, progressRange]
  );

  // ── Scroll progress tracking (progress mode only) ────────────────────────────
  // Use FM's useScroll so the container ref is handled correctly even when the
  // DOM element isn't mounted on the first render tick. FM watches containerRef
  // internally rather than reading .current eagerly.
  const { scrollYProgress } = useScroll({
    container: containerRef ?? undefined,
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (transitionMode === "progress" && progress == null) {
      setScrollProgress(latest);
    }
  });

  // ── Time-based "background-switch-occurred" event listener ───────────────────
  useEffect(() => {
    if (transitionMode !== "time" || transitionStarted || time || position) return;
    const handler = () => {
      if (!transitionStarted) {
        requestAnimationFrame(() => setTransitionStarted(true));
      }
    };
    window.addEventListener("background-switch-occurred", handler as EventListener);
    return () => window.removeEventListener("background-switch-occurred", handler as EventListener);
  }, [transitionMode, transitionStarted, time, position]);

  // ── Scroll position trigger ───────────────────────────────────────────────────
  // Fires once when scrollTop passes a pixel or percentage threshold.
  useEffect(() => {
    if (!position || hasTriggeredRef.current) return;
    const el = containerRef?.current;
    if (!el) return;

    const parsePosition = (pos: number | string): number | null => {
      if (typeof pos === "number") return pos;
      if (typeof pos === "string" && pos.endsWith("%")) {
        const percent = parseFloat(pos);
        if (isNaN(percent)) return null;
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll <= 0) return null;
        return (maxScroll * percent) / 100;
      }
      return null;
    };
    const targetPosition = parsePosition(position);
    if (targetPosition === null) return;
    const checkPosition = () => {
      if (hasTriggeredRef.current) return;
      if (el.scrollTop >= targetPosition) {
        hasTriggeredRef.current = true;
        setPositionTriggered(true);
      }
    };
    checkPosition();
    el.addEventListener("scroll", checkPosition, { passive: true });
    return () => el.removeEventListener("scroll", checkPosition);
  }, [position, containerRef]);

  // ── Timer trigger ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!time || hasTriggeredRef.current) return;
    const id = setTimeout(() => {
      hasTriggeredRef.current = true;
      setPositionTriggered(true);
      setTransitionStarted(true);
    }, time);
    return () => clearTimeout(id);
  }, [time]);

  const effectiveProgress = useMemo(() => {
    if (progress != null) return progress;
    if (transitionMode === "progress") return scrollProgress;
    if (positionTriggered) return 1;
    if (transitionMode === "time" && transitionStarted) return 1;
    return 0;
  }, [progress, scrollProgress, positionTriggered, transitionMode, transitionStarted]);

  const mappedProgress = useMemo(
    () => mapProgressThroughRange(effectiveProgress, progressRange),
    [effectiveProgress, progressRange]
  );

  const transitionStyle = useMemo(() => {
    if (transitionMode === "progress") return {};
    if (!duration) return {};
    return { transition: `opacity ${duration}ms ${easing}` };
  }, [transitionMode, duration, easing]);

  return (
    <BackgroundTransitionPure
      from={from}
      to={to}
      progress={mappedProgress}
      transitionStyle={transitionStyle}
    />
  );
}
