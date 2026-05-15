"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import type { ElementBlock } from "@pb/contracts/types";
import type { MotionPropsFromJson } from "@pb/contracts/peblor/core/peblor-schemas";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { AnimatePresence, MotionFromJson } from "@/peblor/integrations/framer-motion";
import { resolveFoundationMotionControls } from "@/peblor/integrations/framer-motion/foundation-motion-policy";

type Props = Extract<ElementBlock, { type: "elementTooltip" }>;

type Placement = "top" | "bottom" | "left" | "right";

const GAP_DEFAULT = 8;
const VIEWPORT_PAD = 8;
const BRIDGE_OVERLAP = 6;

function parseGapPx(offsetRaw: string | undefined): number {
  if (offsetRaw == null || String(offsetRaw).trim() === "") return GAP_DEFAULT;
  const n = parseFloat(String(offsetRaw));
  return Number.isFinite(n) && n >= 0 ? n : GAP_DEFAULT;
}

function resolvePlacement(requested: Placement | "auto", trigger: DOMRect): Placement {
  if (requested !== "auto") return requested;
  const spaceTop = trigger.top;
  const spaceBottom = window.innerHeight - trigger.bottom;
  return spaceTop >= spaceBottom ? "top" : "bottom";
}

function measureTooltipSize(el: HTMLElement | null): { w: number; h: number } {
  if (!el) return { w: 0, h: 0 };
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

function legacyAnimationToMotion(
  animation: "fade" | "scale" | "slide" | "none" | undefined
): MotionPropsFromJson {
  const enter = 0.35;
  const exit = 0.2;
  switch (animation) {
    case "none":
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
      };
    case "scale":
      return {
        initial: { opacity: 0, scale: 0.96 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { duration: enter, ease: [0.16, 1, 0.3, 1] },
        },
        exit: { opacity: 0, scale: 0.96, transition: { duration: exit, ease: "easeIn" } },
      };
    case "slide":
      return {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: { duration: enter, ease: "easeOut" } },
        exit: { opacity: 0, y: 6, transition: { duration: exit, ease: "easeIn" } },
      };
    case "fade":
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: enter, ease: "easeOut" } },
        exit: { opacity: 0, transition: { duration: exit, ease: "easeIn" } },
      };
  }
}

function resolveTooltipMotion(
  motion: MotionPropsFromJson | undefined,
  animation: "fade" | "scale" | "slide" | "none" | undefined,
  replaceWithFade: boolean
): MotionPropsFromJson {
  if (replaceWithFade) {
    return legacyAnimationToMotion("fade");
  }
  if (motion != null && typeof motion === "object" && Object.keys(motion).length > 0) {
    const m = { ...motion } as Record<string, unknown>;
    if (m.initial == null) m.initial = { opacity: 0 };
    if (m.animate == null) m.animate = { opacity: 1 };
    if (m.exit == null) {
      m.exit = { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } };
    }
    return m as MotionPropsFromJson;
  }
  return legacyAnimationToMotion(animation);
}

export function ElementTooltip({
  content,
  triggerLabel,
  position = "top",
  trigger: triggerMode = "hover",
  showDelay: showMs = 200,
  hideDelay: hideMs = 0,
  offset: offsetRaw,
  arrow,
  interactive,
  followCursor,
  maxWidth: maxWidthRaw,
  zIndex: tooltipZ,
  animation = "fade",
  motion,
  reduceMotion,
  color,
  fontFamily,
  fontSize,
  fontWeight,
  ariaLabel,
  width,
  height,
  align,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex: elZIndex,
  constraints,
  effects,
  interactions,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  backdropFilter,
  hidden,
}: Props) {
  const tooltipId = useId().replace(/:/g, "");
  const [visible, setVisible] = useState(false);
  const [mounted] = useState(true);
  const [dockPortal, setDockPortal] = useState(false);
  const [placement, setPlacement] = useState<Placement>(position === "auto" ? "top" : position);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    transform: string;
  } | null>(null);
  const lastCoordsRef = useRef<{ top: number; left: number; transform: string } | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const showTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const gap = parseGapPx(offsetRaw as string | undefined);

  const motionControls = resolveFoundationMotionControls(reduceMotion);
  const resolvedMotion = resolveTooltipMotion(
    motion as MotionPropsFromJson | undefined,
    animation,
    motionControls.replaceWithFade
  );
  const motionForPanel = motionControls.disableAll
    ? ({ initial: {}, animate: {}, exit: {} } as MotionPropsFromJson)
    : resolvedMotion;

  const clearShowTimer = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const open = useCallback(
    (immediate: boolean) => {
      clearHideTimer();
      setDockPortal(true);
      if (immediate || showMs === 0 || triggerMode === "click") {
        clearShowTimer();
        setVisible(true);
      } else {
        clearShowTimer();
        showTimer.current = setTimeout(() => setVisible(true), showMs);
      }
    },
    [clearHideTimer, clearShowTimer, showMs, triggerMode]
  );

  const close = useCallback(() => {
    clearShowTimer();
    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      setVisible(false);
    }, hideMs);
  }, [clearHideTimer, clearShowTimer, hideMs]);

  const closeNow = useCallback(() => {
    clearShowTimer();
    clearHideTimer();
    setVisible(false);
  }, [clearHideTimer, clearShowTimer]);

  const handleExitComplete = useCallback(() => {
    setDockPortal(false);
    setCoords(null);
    lastCoordsRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearShowTimer();
      clearHideTimer();
    };
  }, [clearHideTimer, clearShowTimer]);

  const updateCoords = useCallback(() => {
    const triggerEl = triggerRef.current;
    const tipEl = tooltipRef.current;
    if (!triggerEl || !tipEl) return;

    const tr = triggerEl.getBoundingClientRect();
    const resolved = resolvePlacement(position, tr);
    setPlacement(resolved);

    const { w: tw, h: th } = measureTooltipSize(tipEl);
    if (tw < 1 || th < 1) return;

    let top = 0;
    let left = 0;
    let transform = "translateZ(0)";

    if (followCursor) {
      top = tr.top + cursorPos.y + 12;
      left = tr.left + cursorPos.x + 12;
      transform = "none";
    } else if (resolved === "top") {
      top = tr.top - th - gap + BRIDGE_OVERLAP;
      left = tr.left + tr.width / 2 - tw / 2;
    } else if (resolved === "bottom") {
      top = tr.bottom + gap - BRIDGE_OVERLAP;
      left = tr.left + tr.width / 2 - tw / 2;
    } else if (resolved === "left") {
      top = tr.top + tr.height / 2 - th / 2;
      left = tr.left - tw - gap + BRIDGE_OVERLAP;
    } else {
      top = tr.top + tr.height / 2 - th / 2;
      left = tr.right + gap - BRIDGE_OVERLAP;
    }

    const maxL = window.innerWidth - VIEWPORT_PAD - tw;
    const minL = VIEWPORT_PAD;
    left = Math.min(maxL, Math.max(minL, left));

    const maxT = window.innerHeight - VIEWPORT_PAD - th;
    const minT = VIEWPORT_PAD;
    top = Math.min(maxT, Math.max(minT, top));

    const next = { top, left, transform };
    setCoords(next);
    lastCoordsRef.current = next;
  }, [position, gap, followCursor, cursorPos]);

  useLayoutEffect(() => {
    if (!dockPortal) return;
    const run = () => {
      requestAnimationFrame(() => updateCoords());
    };
    run();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updateCoords()) : null;
    if (ro && tooltipRef.current) ro.observe(tooltipRef.current);
    const onScrollOrResize = () => updateCoords();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      ro?.disconnect();
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [dockPortal, visible, updateCoords]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, closeNow]);

  useEffect(() => {
    if (!visible || triggerMode !== "click") return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (tooltipRef.current?.contains(t)) return;
      closeNow();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [visible, triggerMode, closeNow]);

  const handlePointerLeaveTrigger = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (triggerMode !== "hover") return;
      const next = e.relatedTarget as Node | null;
      if (tooltipRef.current?.contains(next)) return;
      close();
    },
    [triggerMode, close]
  );

  const handlePointerLeaveTooltip = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const next = e.relatedTarget as Node | null;
      if (triggerRef.current?.contains(next)) return;
      if (tooltipRef.current?.contains(next)) return;
      if (triggerMode === "hover") close();
    },
    [triggerMode, close]
  );

  const handleMouseMoveTrigger = useCallback(
    (e: React.MouseEvent) => {
      if (!followCursor || !triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setCursorPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    },
    [followCursor]
  );

  const defaultTriggerLabel =
    triggerMode === "click" ? "Click" : triggerMode === "focus" ? "Focus" : "Hover";
  const resolvedTriggerLabel = triggerLabel?.trim() || defaultTriggerLabel;

  const bg = (color as string) ?? "rgb(15 15 18 / 0.94)";

  const layout = {
    width: width as string | undefined,
    height: height as string | undefined,
    align: align as "left" | "center" | "right" | undefined,
    marginTop: marginTop as string | undefined,
    marginBottom: marginBottom as string | undefined,
    marginLeft: marginLeft as string | undefined,
    marginRight: marginRight as string | undefined,
    zIndex: elZIndex,
    constraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    backdropFilter,
    hidden,
  };

  const maxW = (maxWidthRaw as string) ?? "min(320px, calc(100vw - 16px))";
  const displayCoords = coords;

  const tooltipPanel = (
    <MotionFromJson
      ref={tooltipRef as React.Ref<HTMLDivElement>}
      key={tooltipId}
      motion={motionForPanel}
      useMotionAsIs
      id={tooltipId}
      role="tooltip"
      className="relative z-[var(--pb-z-base)] max-w-[min(100vw-16px,var(--tt-max,320px))] rounded-lg border border-white/12 px-3 py-2 text-left text-sm leading-snug shadow-2xl backdrop-blur-md"
      style={{
        maxWidth: maxW,
        backgroundColor: bg,
        color: "var(--color-inverse-text, #f4f4f5)",
        fontFamily,
        fontSize: fontSize as string | number | undefined,
        fontWeight: fontWeight as string | number | undefined,
      }}
      onPointerEnter={() => {
        if (triggerMode === "hover" || interactive) clearHideTimer();
      }}
      onPointerLeave={handlePointerLeaveTooltip}
    >
      <span className="block text-pretty select-none">{content}</span>
      {arrow && !followCursor && displayCoords && (
        <span
          className="absolute h-2 w-2 rotate-45 border border-white/15"
          style={{
            backgroundColor: bg,
            ...(placement === "top"
              ? {
                  bottom: "-5px",
                  left: "50%",
                  marginLeft: "-5px",
                  borderTopColor: "transparent",
                  borderLeftColor: "transparent",
                }
              : placement === "bottom"
                ? {
                    top: "-5px",
                    left: "50%",
                    marginLeft: "-5px",
                    borderBottomColor: "transparent",
                    borderRightColor: "transparent",
                  }
                : placement === "left"
                  ? {
                      right: "-5px",
                      top: "50%",
                      marginTop: "-5px",
                      borderBottomColor: "transparent",
                      borderLeftColor: "transparent",
                    }
                  : {
                      left: "-5px",
                      top: "50%",
                      marginTop: "-5px",
                      borderTopColor: "transparent",
                      borderRightColor: "transparent",
                    }),
          }}
          aria-hidden
        />
      )}
    </MotionFromJson>
  );

  const portalLayer = (
    <div
      className="fixed z-[var(--pb-z-tooltip)]"
      style={{
        top: displayCoords?.top ?? -9999,
        left: displayCoords?.left ?? -9999,
        transform: displayCoords?.transform ?? "translateZ(0)",
        zIndex: tooltipZ ?? "var(--pb-z-tooltip)",
        transition: "none",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <AnimatePresence mode="sync" onExitComplete={handleExitComplete}>
        {visible ? tooltipPanel : null}
      </AnimatePresence>
    </div>
  );

  return (
    <ElementLayoutWrapper layout={layout} interactions={interactions}>
      <div className="relative inline-flex flex-col items-center overflow-visible">
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex min-h-9 min-w-[4.5rem] cursor-default select-none items-center justify-center rounded-lg border border-white/15 bg-white/6 px-3 py-1.5 text-center text-sm font-medium text-foreground shadow-sm outline-none backdrop-blur-sm transition-[background-color,box-shadow,transform] hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.98]"
          aria-describedby={visible ? tooltipId : undefined}
          aria-expanded={triggerMode === "click" ? visible : undefined}
          aria-haspopup={triggerMode === "click" ? "true" : undefined}
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerEnter={() => {
            if (triggerMode === "hover") open(false);
          }}
          onPointerLeave={handlePointerLeaveTrigger}
          onMouseMove={followCursor ? handleMouseMoveTrigger : undefined}
          onFocus={() => {
            if (triggerMode === "focus") open(false);
          }}
          onBlur={(e) => {
            if (triggerMode !== "focus") return;
            const next = e.relatedTarget as Node | null;
            if (tooltipRef.current?.contains(next)) return;
            closeNow();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (triggerMode !== "click") return;
            if (visible) closeNow();
            else open(true);
          }}
        >
          {resolvedTriggerLabel}
        </button>
        {mounted && dockPortal && typeof document !== "undefined"
          ? createPortal(portalLayer, document.body)
          : null}
      </div>
    </ElementLayoutWrapper>
  );
}
