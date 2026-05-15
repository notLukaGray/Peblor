"use client";

import { useRef, useEffect, useMemo } from "react";
import type { RefObject } from "react";
import { useScroll } from "./triggers";
import type { UseScrollOptions } from "framer-motion";
import { useTransform, useMotionValueEvent } from "./motion-values";
import { animate } from "./animations";
import type { Easing, MotionValue } from "./types";
import { useScrollContainerRef } from "@/peblor/section/position/use-scroll-container";
import type {
  BgLayerMotion,
  BgScrollMotion,
  BgPointerMotion,
  BgParallaxMotion,
  BgTriggerMotion,
} from "@/peblor/background/motion/bg-layer-motion-types";

// ── Interpolation helpers ─────────────────────────────────────────────────────

/**
 * Map a normalised progress value [0–1] linearly between two arbitrary values.
 *
 * Supported forms (in priority order):
 *   number            42 → 80
 *   number+unit       "0px" → "100px",  "0%" → "50%",  "0deg" → "360deg"
 *   CSS single-arg fn "hue-rotate(0deg)" → "hue-rotate(180deg)",
 *                     "rotate(0deg)"  →  "rotate(90deg)"
 *   fallback          steps at midpoint (0.5)
 */
function interpolateProp(start: unknown, end: unknown, t: number, clamp = true): unknown {
  const tc = clamp ? Math.max(0, Math.min(1, t)) : t;

  if (typeof start === "number" && typeof end === "number") {
    return start + (end - start) * tc;
  }

  if (typeof start === "string" && typeof end === "string") {
    // "number+unit"  e.g. "0%", "100px", "360deg"
    const numUnit1 = start.match(/^([-\d.]+)([a-z%]*)$/i);
    const numUnit2 = end.match(/^([-\d.]+)([a-z%]*)$/i);
    if (numUnit1 && numUnit2 && numUnit1[2] === numUnit2[2]) {
      const startNum = numUnit1[1];
      const endNum = numUnit2[1];
      if (startNum == null || endNum == null) return tc < 0.5 ? start : end;
      const v = parseFloat(startNum) + (parseFloat(endNum) - parseFloat(startNum)) * tc;
      return `${v}${numUnit1[2]}`;
    }

    // CSS single-argument function  e.g. "hue-rotate(0deg)" → "hue-rotate(180deg)"
    const fn1 = start.match(/^([\w-]+)\(([-\d.]+)([a-z%]*)\)$/i);
    const fn2 = end.match(/^([\w-]+)\(([-\d.]+)([a-z%]*)\)$/i);
    if (fn1 && fn2 && fn1[1] === fn2[1] && fn1[3] === fn2[3]) {
      const startArg = fn1[2];
      const endArg = fn2[2];
      const name = fn1[1];
      const unit = fn1[3];
      if (startArg == null || endArg == null || name == null || unit == null) {
        return tc < 0.5 ? start : end;
      }
      const v = parseFloat(startArg) + (parseFloat(endArg) - parseFloat(startArg)) * tc;
      return `${name}(${v}${unit})`;
    }

    return tc < 0.5 ? start : end;
  }

  return tc < 0.5 ? start : end;
}

/**
 * Lerp a single value toward `target` by `factor` (0–1 per frame).
 * Same type support as `interpolateProp`.
 */
function lerpProp(current: unknown, target: unknown, factor: number): unknown {
  if (typeof current === "number" && typeof target === "number") {
    return current + (target - current) * factor;
  }
  if (typeof current === "string" && typeof target === "string") {
    const m1 = current.match(/^([-\d.]+)([a-z%]*)$/i);
    const m2 = target.match(/^([-\d.]+)([a-z%]*)$/i);
    if (m1 && m2 && m1[2] === m2[2]) {
      const c = m1[1];
      const t = m2[1];
      if (c == null || t == null) return target;
      const v = parseFloat(c) + (parseFloat(t) - parseFloat(c)) * factor;
      return `${v}${m1[2]}`;
    }
  }
  return target;
}

/** Write a property value to a DOM element's style, supporting CSS custom properties. */
function applyStyleProp(el: HTMLElement, prop: string, value: unknown): void {
  if (prop.startsWith("--")) {
    el.style.setProperty(prop, String(value));
  } else {
    (el.style as unknown as Record<string, unknown>)[prop] = value;
  }
}

// ── Return type ───────────────────────────────────────────────────────────────

export type BgLayerMotionStyle = {
  /**
   * MotionValues to spread directly onto a `motion.div`'s `style` prop.
   * Currently used by parallax to drive backgroundPositionX / backgroundPositionY
   * as live MotionValues (bypassing React render cycle entirely).
   */
  motionStyle: Record<string, MotionValue<string>>;
};

// ── Main hook ─────────────────────────────────────────────────────────────────

/**
 * Handles the non-FM-animate motion types for a background layer:
 * scroll, pointer, parallax, trigger.
 *
 * This hook always runs all its internal hooks unconditionally (hooks rules).
 * When a given motion type is absent from the `motions` array, its hooks are
 * no-ops and its effects return early.
 *
 * @param motions  - Full motion array from the layer (all types, not pre-filtered).
 * @param layerRef - Ref attached to the layer's DOM element (used for direct style writes + imperativeAnimate).
 *
 * @returns `motionStyle` — spread onto `motion.div`'s `style` prop.
 */
export function useBgLayerMotion(
  motions: BgLayerMotion[],
  layerRef: RefObject<HTMLElement | null>
): BgLayerMotionStyle {
  const scrollMotions = useMemo(
    () => motions.filter((m): m is BgScrollMotion => m.type === "scroll"),
    [motions]
  );
  const pointerMotions = useMemo(
    () => motions.filter((m): m is BgPointerMotion => m.type === "pointer"),
    [motions]
  );
  const parallaxMotion = useMemo(
    () => motions.find((m): m is BgParallaxMotion => m.type === "parallax"),
    [motions]
  );
  const triggerMotions = useMemo(
    () => motions.filter((m): m is BgTriggerMotion => m.type === "trigger"),
    [motions]
  );

  // Picks up the project's scroll container (overflow-y:auto div from layout).
  // Falls back gracefully to window scroll when no provider is present.
  const containerRef = useScrollContainerRef();

  // ── Parallax ─────────────────────────────────────────────────────────
  // Always call useScroll + useTransform (hooks must be unconditional).
  // When no parallax is configured, the MotionValues are neutral (0% → 0%) and unused.

  const { scrollYProgress: parallaxProgress } = useScroll({
    container: containerRef ?? undefined,
    offset: (parallaxMotion?.offset ?? ["start start", "end end"]) as UseScrollOptions["offset"],
  });

  const parallaxAxis = parallaxMotion?.axis ?? "y";
  const parallaxSpeed = parallaxMotion?.speed ?? 0;

  const parallaxX = useTransform(
    parallaxProgress,
    [0, 1],
    parallaxAxis === "x" ? ["0%", `${parallaxSpeed * 100}%`] : ["0%", "0%"]
  );
  const parallaxY = useTransform(
    parallaxProgress,
    [0, 1],
    parallaxAxis === "y" ? ["0%", `${parallaxSpeed * 100}%`] : ["0%", "0%"]
  );

  // ── Scroll ────────────────────────────────────────────────────────────
  // Drives CSS properties (including custom properties) from page-scroll progress.
  // Direct DOM style writes — no React re-renders.

  const { scrollYProgress: scrollMotionProgress } = useScroll({
    container: containerRef ?? undefined,
    offset: (scrollMotions[0]?.offset ?? ["start start", "end end"]) as UseScrollOptions["offset"],
  });

  useMotionValueEvent(scrollMotionProgress, "change", (progress) => {
    if (!layerRef.current || scrollMotions.length === 0) return;
    for (const sm of scrollMotions) {
      const clamp = sm.clamp !== false;
      for (const [prop, [start, end]] of Object.entries(sm.properties)) {
        const value = interpolateProp(start, end, progress, clamp);
        applyStyleProp(layerRef.current, prop, value);
      }
    }
  });

  // ── Pointer ────────────────────────────────────────────────────────────
  // RAF-based lerp toward mouse position. Runs only when pointer motions are present.

  const pointerTargetRef = useRef<Record<string, unknown>>({});
  const pointerCurrentRef = useRef<Record<string, unknown>>({});
  const pointerRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (pointerMotions.length === 0) return;

    const lerpFactor = pointerMotions[0]?.ease ?? 0.08;

    const onMouseMove = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth;
      const ny = e.clientY / window.innerHeight;

      for (const pm of pointerMotions) {
        if (pm.x) {
          for (const [prop, [from, to]] of Object.entries(pm.x)) {
            pointerTargetRef.current[prop] = interpolateProp(from, to, nx, true);
          }
        }
        if (pm.y) {
          for (const [prop, [from, to]] of Object.entries(pm.y)) {
            pointerTargetRef.current[prop] = interpolateProp(from, to, ny, true);
          }
        }
      }
    };

    const tick = () => {
      const el = layerRef.current;
      if (el) {
        for (const [prop, target] of Object.entries(pointerTargetRef.current)) {
          const current = pointerCurrentRef.current[prop];
          const next = current === undefined ? target : lerpProp(current, target, lerpFactor);
          pointerCurrentRef.current[prop] = next;
          applyStyleProp(el, prop, next);
        }
      }
      pointerRafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    pointerRafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (pointerRafRef.current !== null) {
        cancelAnimationFrame(pointerRafRef.current);
        pointerRafRef.current = null;
      }
    };
  }, [pointerMotions, layerRef]);

  // ── Trigger ─────────────────────────────────────────────────────────────
  // Imperative FM animate() calls in response to custom window events.
  // Each trigger config gets its own event listener; multiple configs coexist.

  useEffect(() => {
    if (triggerMotions.length === 0) return;

    const cleanups: Array<() => void> = [];
    // Track toggle state per trigger id (false = resting at "from")
    const toggleState: Record<string, boolean> = {};

    for (const tm of triggerMotions) {
      toggleState[tm.id] = false;

      // Auto-play: fire on mount after optional delay
      if (tm.autoPlay) {
        const delayMs = (tm.autoPlayDelay ?? 0) * 1000;
        const timer = window.setTimeout(() => {
          if (!layerRef.current) return;
          void animate(layerRef.current, tm.to as Record<string, string | number>, {
            duration: tm.transition?.duration ?? 0.8,
            ease: ((tm.transition?.ease as string | undefined) ?? "easeOut") as Easing,
            delay: tm.transition?.delay ?? 0,
          });
          toggleState[tm.id] = true;
        }, delayMs);
        cleanups.push(() => clearTimeout(timer));
      }

      // Event listener
      const handler = () => {
        if (!layerRef.current) return;
        const shouldGoToActive = tm.toggle ? !toggleState[tm.id] : true;
        const target = shouldGoToActive ? tm.to : tm.from;
        void animate(layerRef.current, target as Record<string, string | number>, {
          duration: tm.transition?.duration ?? 0.8,
          ease: ((tm.transition?.ease as string | undefined) ?? "easeOut") as Easing,
          delay: tm.transition?.delay ?? 0,
        });
        if (tm.toggle) toggleState[tm.id] = shouldGoToActive;
      };

      window.addEventListener(tm.id, handler);
      cleanups.push(() => window.removeEventListener(tm.id, handler));
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [triggerMotions, layerRef]);

  // ── Return ─────────────────────────────────────────────────────────────
  // Only expose parallax MotionValues when parallax is actually configured.
  // This prevents unnecessary MotionValue subscriptions on plain layers.

  const motionStyle: Record<string, MotionValue<string>> = {};
  if (parallaxMotion) {
    if (parallaxAxis === "x") {
      motionStyle.backgroundPositionX = parallaxX;
    } else {
      motionStyle.backgroundPositionY = parallaxY;
    }
  }

  return { motionStyle };
}
