"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MotionPropsFromJson } from "@pb/contracts/peblor/core/peblor-schemas";

type HoverExitDelayResult = {
  /** Whether the user's pointer is currently hovering the element. */
  isHovering: boolean;
  /** Stripped motion config without hoverExitDelayMs / whileHover (when delay is active). */
  cleanedMotion: MotionPropsFromJson | undefined;
  /** Extracted whileHover keyframe (when delay is active). */
  resolvedWhileHover: Record<string, unknown> | undefined;
  /** Props to spread onto the motion element for hover event handling. */
  hoverDelayProps: {
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
    whileHover?: Record<string, unknown>;
  };
};

/**
 * Manages hover exit delay for motion elements.
 *
 * When `hoverExitDelayMs` is set on a motion config, hovering over the element applies
 * `whileHover` immediately, but leaving the element defers the `whileHover` removal
 * by the configured delay. This is useful for dropdown menus, tooltips, and other
 * UI patterns where a brief delay prevents flickering.
 */
export function useHoverExitDelay(
  resolvedMotionFromJson: MotionPropsFromJson | undefined
): HoverExitDelayResult {
  const hoverExitDelayMs = useMemo(() => {
    if (!resolvedMotionFromJson || typeof resolvedMotionFromJson !== "object") return undefined;
    const m = resolvedMotionFromJson as Record<string, unknown>;
    return typeof m.hoverExitDelayMs === "number" ? (m.hoverExitDelayMs as number) : undefined;
  }, [resolvedMotionFromJson]);

  const [isHovering, setIsHovering] = useState(false);
  const hoverExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerEnter = useCallback(() => {
    if (hoverExitTimerRef.current) {
      clearTimeout(hoverExitTimerRef.current);
      hoverExitTimerRef.current = null;
    }
    setIsHovering(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (hoverExitDelayMs && hoverExitDelayMs > 0) {
      hoverExitTimerRef.current = setTimeout(() => {
        setIsHovering(false);
      }, hoverExitDelayMs);
    } else {
      setIsHovering(false);
    }
  }, [hoverExitDelayMs]);

  useEffect(() => {
    return () => {
      if (hoverExitTimerRef.current) clearTimeout(hoverExitTimerRef.current);
    };
  }, []);

  const cleanedMotion = useMemo(() => {
    if (hoverExitDelayMs === undefined) return resolvedMotionFromJson;
    if (!resolvedMotionFromJson || typeof resolvedMotionFromJson !== "object")
      return resolvedMotionFromJson;
    const {
      hoverExitDelayMs: _,

      whileHover: _wh,
      ...rest
    } = resolvedMotionFromJson as Record<string, unknown>;
    return rest as MotionPropsFromJson;
  }, [hoverExitDelayMs, resolvedMotionFromJson]);

  const resolvedWhileHover = useMemo(() => {
    if (
      hoverExitDelayMs === undefined ||
      !resolvedMotionFromJson ||
      typeof resolvedMotionFromJson !== "object"
    )
      return undefined;
    return (resolvedMotionFromJson as Record<string, unknown>).whileHover as
      | Record<string, unknown>
      | undefined;
  }, [hoverExitDelayMs, resolvedMotionFromJson]);

  const hoverDelayProps: HoverExitDelayResult["hoverDelayProps"] = useMemo(() => {
    const hasHoverExitDelay = hoverExitDelayMs !== undefined;
    if (!hasHoverExitDelay) {
      return {};
    }
    return {
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      ...(isHovering && resolvedWhileHover ? { whileHover: resolvedWhileHover } : {}),
    };
  }, [hoverExitDelayMs, handlePointerEnter, handlePointerLeave, isHovering, resolvedWhileHover]);

  return {
    isHovering,
    cleanedMotion,
    resolvedWhileHover,
    hoverDelayProps,
  };
}
