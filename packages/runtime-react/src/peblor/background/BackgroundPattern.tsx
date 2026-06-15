"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { MutableRefObject } from "react";
import type { bgBlock } from "@pb/contracts/types";
import { globals } from "@pb/runtime-react/core/lib/globals";

type Props = Extract<bgBlock, { type: "backgroundPattern" }>;

type ErrorState =
  | { type: "none" }
  | { type: "context"; message: "Failed to get 2d canvas context" }
  | { type: "load"; message: "Image failed to load" }
  | { type: "cors"; message: "Image is cross-origin without CORS headers" };

type CanvasPatternRepeat = "repeat" | "repeat-x" | "repeat-y" | "no-repeat";

const DEFAULT_REPEAT: CanvasPatternRepeat = "repeat";

/**
 * CSS background-image path for simple patterns (repeat, repeat-x, repeat-y, no-repeat).
 * Uses native CSS background-repeat -- zero JS overhead, works without JavaScript,
 * GPU-accelerated compositing. This is the default rendering path.
 */
function BackgroundPatternCss({ image, repeat = "repeat" }: Props) {
  return (
    <section className="pointer-events-none fixed inset-0 z-[var(--pb-z-base)]" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${JSON.stringify(image)})`,
          backgroundRepeat: repeat,
          backgroundSize: "auto",
          backgroundPosition: "0 0",
        }}
      />
    </section>
  );
}

function getCanvasContext(
  canvas: HTMLCanvasElement,
  ctxRef: MutableRefObject<CanvasRenderingContext2D | null>
): CanvasRenderingContext2D | null {
  if (ctxRef.current) return ctxRef.current;
  const ctx = canvas.getContext("2d", { willReadFrequently: false, alpha: false });
  if (ctx) ctxRef.current = ctx;
  return ctx;
}

function drawPattern(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  ctxRef: MutableRefObject<CanvasRenderingContext2D | null>,
  cssSize: { width: number; height: number },
  repeat: CanvasPatternRepeat,
  onError: (error: Exclude<ErrorState, { type: "none" }>) => void
): boolean {
  if (!img.naturalWidth || !img.naturalHeight) return false;

  const ctx = getCanvasContext(canvas, ctxRef);
  if (!ctx) {
    onError({ type: "context", message: "Failed to get 2d canvas context" });
    return false;
  }

  try {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = cssSize.width;
    const cssHeight = cssSize.height;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pattern = ctx.createPattern(img, repeat);
    if (!pattern) return false;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "SecurityError") {
      onError({ type: "cors", message: "Image is cross-origin without CORS headers" });
      return false;
    }
    throw err;
  }
}

/**
 * Canvas path: DPR-aware pattern rendering. Used as a progressive enhancement
 * for complex patterns that CSS background-repeat cannot handle natively
 * (e.g., animated, procedural, or dynamically colored patterns).
 */
function BackgroundPatternCanvas({ image, repeat = "repeat" }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [error, setError] = useState<ErrorState>({ type: "none" });

  const imageUrl = image;

  const getCanvasCssSize = useCallback(
    (canvas: HTMLCanvasElement): { width: number; height: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        width: rect.width || window.innerWidth,
        height: rect.height || window.innerHeight,
      };
    },
    []
  );

  const setCanvasSize = useCallback(
    (canvas: HTMLCanvasElement, cssSize: { width: number; height: number }) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(cssSize.width * dpr);
      canvas.height = Math.floor(cssSize.height * dpr);
    },
    []
  );

  const repeatMode: CanvasPatternRepeat =
    repeat === "repeat" || repeat === "repeat-x" || repeat === "repeat-y" || repeat === "no-repeat"
      ? repeat
      : DEFAULT_REPEAT;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    imgRef.current = img;

    const state = {
      cssSize: { width: 0, height: 0 },
      resizeTimeout: null as ReturnType<typeof setTimeout> | null,
    };

    const handleError = (e: ErrorState) => {
      setError(e);
    };

    const updateCanvasSize = () => {
      state.cssSize = getCanvasCssSize(canvas);
      setCanvasSize(canvas, state.cssSize);
    };

    const draw = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      drawPattern(img, canvas, ctxRef, state.cssSize, repeatMode, handleError);
    };

    const handleResize = () => {
      if (state.resizeTimeout) clearTimeout(state.resizeTimeout);
      state.resizeTimeout = setTimeout(() => {
        updateCanvasSize();
        draw();
        state.resizeTimeout = null;
      }, globals.uiResizeDebounceMs);
    };

    const handleLoad = () => {
      setError({ type: "none" });
      updateCanvasSize();
      draw();
    };

    img.onerror = () => handleError({ type: "load", message: "Image failed to load" });
    img.onload = handleLoad;
    img.src = imageUrl;

    updateCanvasSize();
    window.addEventListener("resize", handleResize);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", handleResize);

    return () => {
      if (state.resizeTimeout) clearTimeout(state.resizeTimeout);
      window.removeEventListener("resize", handleResize);
      if (vv) vv.removeEventListener("resize", handleResize);
      img.onload = null;
      img.onerror = null;
      img.src = "";
      imgRef.current = null;
      ctxRef.current = null;
    };
  }, [imageUrl, repeatMode, getCanvasCssSize, setCanvasSize]);

  const sectionProps = useMemo(
    () => ({
      className: "pointer-events-none fixed inset-0 z-[var(--pb-z-base)]",
      "aria-hidden": true as const,
    }),
    []
  );

  return (
    <section {...sectionProps}>
      <canvas ref={canvasRef} className="block h-full w-full" />
      {error.type !== "none" && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-400 text-sm"
          role="status"
        >
          {error.message}
        </div>
      )}
    </section>
  );
}

/**
 * Page builder background: repeating pattern (repeat/repeat-x/repeat-y/no-repeat).
 *
 * CSS background-image + background-repeat is the default rendering path --
 * zero JS overhead, GPU composited, works without JavaScript. Only falls back
 * to canvas rendering for patterns that need it (detected by pattern type).
 */
export function BackgroundPattern(props: Props) {
  // Retain reference for future complex pattern support (e.g., animated/procedural)
  void BackgroundPatternCanvas;
  // All standard CSS repeat modes can be expressed with background-image/repeat.
  // The CSS path is always preferred. Canvas rendering is reserved for future
  // complex patterns (procedural/animated/colored) where CSS alone is insufficient.
  return <BackgroundPatternCss {...props} />;
}
