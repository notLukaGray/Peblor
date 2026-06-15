"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { MutableRefObject } from "react";
import type { bgBlock } from "@pb/contracts/types";
import { globals } from "@pb/runtime-react/core/lib/globals";
import { lowerThemeStringToCss } from "@/peblor/theme/theme-string";

type Props = Extract<bgBlock, { type: "backgroundImage" }> & { priority?: boolean };

type ErrorState =
  | { type: "none" }
  | { type: "context"; message: "Failed to get 2d canvas context" }
  | { type: "load"; message: "Image failed to load" }
  | { type: "cors"; message: "Image is cross-origin without CORS headers" };

function getCanvasContext(
  canvas: HTMLCanvasElement,
  ctxRef: MutableRefObject<CanvasRenderingContext2D | null>
): CanvasRenderingContext2D | null {
  if (ctxRef.current) return ctxRef.current;
  const ctx = canvas.getContext("2d", { willReadFrequently: false, alpha: false });
  if (ctx) ctxRef.current = ctx;
  return ctx;
}

function drawImageCover(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  ctxRef: MutableRefObject<CanvasRenderingContext2D | null>,
  cssSize: { width: number; height: number },
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

    const scale = Math.max(cssWidth / img.naturalWidth, cssHeight / img.naturalHeight);
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;
    ctx.drawImage(
      img,
      (cssWidth - scaledWidth) / 2,
      (cssHeight - scaledHeight) / 2,
      scaledWidth,
      scaledHeight
    );
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
 * CSS background-image path: used when `backgroundSize`, `backgroundPosition`,
 * `backgroundRepeat`, `backgroundAttachment`, or `overlay` are explicitly set.
 * Renders a fixed-position div with CSS background properties.
 */
function BackgroundImageCss({
  image,
  backgroundSize,
  backgroundPosition,
  backgroundRepeat,
  backgroundAttachment,
  overlay,
}: Props) {
  const overlayColor = lowerThemeStringToCss(overlay);
  return (
    <section className="pointer-events-none fixed inset-0 z-[var(--pb-z-base)]" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${JSON.stringify(image)})`,
          backgroundSize: backgroundSize ?? "cover",
          backgroundPosition: backgroundPosition ?? "center",
          backgroundRepeat: backgroundRepeat ?? "no-repeat",
          backgroundAttachment: backgroundAttachment ?? "scroll",
        }}
      />
      {overlayColor && <div className="absolute inset-0" style={{ background: overlayColor }} />}
    </section>
  );
}

/** Canvas path: DPR-aware full-bleed image via 2D canvas. Used when no CSS control props are set. */
function BackgroundImageCanvas({ image, priority }: Props) {
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
      drawImageCover(img, canvas, ctxRef, state.cssSize, handleError);
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
  }, [imageUrl, getCanvasCssSize, setCanvasSize]);

  const sectionProps = useMemo(
    () => ({
      className: "pointer-events-none fixed inset-0 z-[var(--pb-z-base)]",
      "aria-hidden": true as const,
    }),
    []
  );

  return (
    <section {...sectionProps}>
      {priority && imageUrl && (
        // React 19 hoists this to <head> during SSR so the browser discovers it before JS runs.
        <link rel="preload" as="image" href={imageUrl} fetchPriority="high" />
      )}
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
 * Page builder background: full-bleed image.
 *
 * Renders via canvas (DPR-aware) by default for highest visual fidelity.
 * Falls back to CSS `background-image` when any explicit CSS control property
 * (`backgroundSize`, `backgroundPosition`, `backgroundRepeat`, `backgroundAttachment`,
 * or `overlay`) is set — those properties can't be expressed on a canvas element.
 */
export function BackgroundImage(props: Props) {
  const { backgroundSize, backgroundPosition, backgroundRepeat, backgroundAttachment, overlay } =
    props;

  const useCssPath =
    backgroundSize != null ||
    backgroundPosition != null ||
    backgroundRepeat != null ||
    backgroundAttachment != null ||
    overlay != null;

  if (useCssPath) {
    return <BackgroundImageCss {...props} />;
  }

  return <BackgroundImageCanvas {...props} />;
}
