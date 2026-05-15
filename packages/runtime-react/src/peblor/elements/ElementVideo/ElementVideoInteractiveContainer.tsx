"use client";

import type { ReactNode } from "react";
import type { CSSProperties } from "react";

export type ElementVideoInteractiveContainerProps = {
  containerRef: React.RefObject<HTMLSpanElement | null>;
  style?: CSSProperties;
  isFullscreen?: boolean;
  role?: React.AriaRole;
  "aria-label"?: string;
  onContextMenu: (e: React.MouseEvent) => void;
  onTouchStart: () => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLSpanElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onMouseMove?: () => void;
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLSpanElement>) => void;
  tabIndex?: number;
  children: ReactNode;
};

/** Fullscreen fill: Chrome/WebKit do not auto-size the fullscreen element; use viewport units so the bar's container has a definite size. */
const fullscreenFillStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  minWidth: "100%",
  minHeight: "100%",
};

/** Container span with gesture handlers for module-driven video (tap, touch, hover). */
export function ElementVideoInteractiveContainer({
  containerRef,
  style,
  isFullscreen = false,
  role,
  "aria-label": ariaLabel,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  onClick,
  onKeyDown,
  tabIndex,
  children,
}: ElementVideoInteractiveContainerProps) {
  return (
    <span
      ref={containerRef}
      role={role}
      aria-label={ariaLabel}
      className="video-module-fullscreen-container relative block w-full h-full select-none"
      style={{
        ...style,
        WebkitTapHighlightColor: "transparent",
        WebkitTouchCallout: "none",
        touchAction: "manipulation",
        outline: "none",
        ...(isFullscreen ? fullscreenFillStyle : {}),
      }}
      tabIndex={tabIndex}
      onContextMenu={onContextMenu}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </span>
  );
}
