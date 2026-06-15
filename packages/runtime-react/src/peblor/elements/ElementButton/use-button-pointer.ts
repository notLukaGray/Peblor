"use client";

import { useEffect, useId, useInsertionEffect, useRef, useState, type RefCallback } from "react";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";
import { generateKeyframes, buildAnimationValue } from "@pb/core/css-keyframe-utils";

// ── Pre-compiled button loop CSS (generated at build time) ──────────────────────

export type ButtonLoopCss = {
  keyframes: string;
  animation: string;
};

// ── Types ──────────────────────────────────────────────────────────────────────

type BgFillPointerMotion = {
  type: "pointer";
  ease?: number;
};

type BgFillLoopMotion = {
  type: "loop";
  to: Record<string, (string | number)[]>;
  transition: {
    duration: number;
    ease?: string | [number, number, number, number];
    delay?: number;
    repeatType?: "loop" | "reverse" | "mirror";
  };
};

type BgFillEntranceMotion = {
  type: "entrance";
  from: Record<string, string | number>;
  to: Record<string, string | number>;
  transition: {
    duration: number;
    ease?: string | [number, number, number, number];
    delay?: number;
  };
};

export type BgFillMotion = BgFillPointerMotion | BgFillLoopMotion | BgFillEntranceMotion;

export type BgFillConfig = {
  fill: unknown;
  backgroundSize?: string;
  motion?: BgFillMotion[];
  /**
   * Pre-compiled button loop animation CSS, generated at build time by the
   * element pipeline (precompileButtonLoopCssOnElement). When present,
   * the hook injects this CSS directly instead of generating keyframes
   * at runtime via useInsertionEffect.
   */
  _buttonLoopCss?: ButtonLoopCss;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Handles background-fill motion for buttons: pointer tracking, loop animations,
 * and entrance animations. Writes CSS custom properties and animation styles
 * directly to the wrapper span DOM element for zero-React-render performance.
 *
 * Returns a callback ref to attach to the button's wrapper span, plus any
 * static animation style properties (loop @keyframes shorthand).
 */
export function useButtonPointer(config: BgFillConfig | undefined): {
  ref: RefCallback<HTMLElement>;
  animationStyle: Record<string, string>;
} {
  // Stable element ref — set by the returned callback ref, read by effects.
  const elRef = useRef<HTMLElement | null>(null);
  // Flip to true when the wrapper span mounts. Triggers effects that need the DOM node.
  const [mounted, setMounted] = useState(false);
  const uid = useId().replace(/:/g, "");

  // ── Partition motions ──────────────────────────────────────────────────
  const pointerEase: number | undefined = config?.motion?.find(
    (m): m is BgFillPointerMotion => m.type === "pointer"
  )?.ease;
  const hasPointer =
    pointerEase !== undefined || (config?.motion?.some((m) => m.type === "pointer") ?? false);
  const loopMotions: BgFillLoopMotion[] =
    (config?.motion?.filter((m): m is BgFillLoopMotion => m.type === "loop") as
      | BgFillLoopMotion[]
      | undefined) ?? [];
  const entranceMotion: BgFillEntranceMotion | undefined = config?.motion?.find(
    (m): m is BgFillEntranceMotion => m.type === "entrance"
  );

  // ── Ref callback ───────────────────────────────────────────────────────
  const ref: RefCallback<HTMLElement> = (node) => {
    if (node) {
      elRef.current = node;
      if (!mounted) setMounted(true);
    }
  };

  // ── Loop: inject @keyframes CSS ────────────────────────────────────────

  // When _buttonLoopCss is present (pre-compiled at build time), use it directly
  // instead of generating keyframes at runtime.
  const buttonLoopCss = config?._buttonLoopCss;
  const animationStyle: Record<string, string> = {};

  // Stable identity keys for the useInsertionEffect dependency array.
  // Deriving a JSON key from the actual keyframe content (animate maps +
  // transition config) lets React re-inject styles when an author edits
  // bgFill.motion in dev/studio, without adding unstable object references
  // that would force a style-teardown on every render.
  const loopMotionsKey =
    loopMotions.length > 0
      ? JSON.stringify(loopMotions.map((m) => ({ a: m.to, t: m.transition })))
      : "";
  const buttonLoopCssKey = buttonLoopCss
    ? `${buttonLoopCss.keyframes}|${buttonLoopCss.animation}`
    : "";

  // Branch inside the effect, not around it — React hooks must be called
  // unconditionally in the same order on every render.
  useInsertionEffect(() => {
    if (buttonLoopCss) {
      const styleEl = document.createElement("style");
      styleEl.textContent = buttonLoopCss.keyframes;
      document.head.appendChild(styleEl);
      return () => {
        document.head.removeChild(styleEl);
      };
    }
    if (loopMotions.length === 0) return;
    const fallbackNames = loopMotions.map((_, i) => `pb-btn-loop-${uid}-${i}`);
    const keyframesCss = loopMotions
      .map((m, i) => generateKeyframes(fallbackNames[i]!, m.to))
      .join("\n");
    const styleEl = document.createElement("style");
    styleEl.textContent = keyframesCss;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, [uid, loopMotionsKey, buttonLoopCssKey]);

  if (buttonLoopCss) {
    animationStyle.animation = buttonLoopCss.animation;
  } else if (loopMotions.length > 0) {
    animationStyle.animation = loopMotions
      .map((m, i) => buildAnimationValue(`pb-btn-loop-${uid}-${i}`, m.transition))
      .join(", ");
  }

  // ── Pointer: RAF-based lerp ────────────────────────────────────────────
  const targetRef = useRef({ cx: 50, cy: 50 });
  const currentRef = useRef({ cx: 50, cy: 50 });

  useEffect(() => {
    const el = elRef.current;
    if (!hasPointer || !el) return;

    const ease = pointerEase ?? MOTION_DEFAULTS.buttonPointerLerpFactor;
    const tgt = el;
    tgt.dataset.pbPointerActive = "";

    function onPointerMove(e: PointerEvent) {
      const rect = tgt.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      targetRef.current.cx = Math.max(0, Math.min(100, x));
      targetRef.current.cy = Math.max(0, Math.min(100, y));
    }

    let raf: number;
    function tick() {
      const cx = currentRef.current.cx + (targetRef.current.cx - currentRef.current.cx) * ease;
      const cy = currentRef.current.cy + (targetRef.current.cy - currentRef.current.cy) * ease;
      currentRef.current.cx = cx;
      currentRef.current.cy = cy;
      tgt.style.setProperty("--cx", `${cx}%`);
      tgt.style.setProperty("--cy", `${cy}%`);
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      delete tgt.dataset.pbPointerActive;
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(raf);
    };
  }, [hasPointer, pointerEase, mounted]);

  // ── Entrance: imperative animate() on mount ────────────────────────────
  useEffect(() => {
    const el = elRef.current;
    if (!entranceMotion || !el) return;

    const { from: initial, to, transition } = entranceMotion;

    for (const [prop, value] of Object.entries(initial)) {
      el.style.setProperty(prop, String(value));
    }

    const raf = requestAnimationFrame(() => {
      const keyframes: Keyframe[] = [
        Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v)])),
        Object.fromEntries(Object.entries(to).map(([k, v]) => [k, String(v)])),
      ];

      const opts: KeyframeAnimationOptions = {
        duration: transition.duration * 1000,
        easing: Array.isArray(transition.ease)
          ? `cubic-bezier(${transition.ease.join(",")})`
          : (transition.ease ?? "ease-out"),
        delay: (transition.delay ?? 0) * 1000,
        fill: "forwards",
      };

      el.animate(keyframes, opts);
    });

    return () => cancelAnimationFrame(raf);
  }, [entranceMotion, mounted]);

  return { ref, animationStyle };
}
