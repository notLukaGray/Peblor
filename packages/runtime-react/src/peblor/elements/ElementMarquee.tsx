"use client";

import type { CSSProperties } from "react";
import {
  useRef,
  useState,
  useMemo,
  useId,
  useInsertionEffect,
  useLayoutEffect,
  useEffect,
} from "react";
import type { ElementBlock } from "@pb/contracts/types";
import {
  getBodyTypographyClass,
  getHeadingTypographyClass,
  resolveFontFamily,
} from "@pb/core/typography";
import { lowerThemeStringToCss } from "@/peblor/theme/theme-string";
import { globals } from "@pb/runtime-react/core/lib/globals";
import { useVariable } from "@/peblor/runtime/peblor-variable-store";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { usePrefersReducedMotion } from "./ElementInfiniteScroll/use-prefers-reduced-motion";
import { useAfterLcp } from "../../core/hooks/use-after-lcp";

type Props = Extract<ElementBlock, { type: "elementMarquee" }>;

/** When omitted or `auto`: glyphs follow the path tangent (SVG default). `0deg` / `0` keeps glyphs upright. */
function svgTextRotateForPath(offsetRotate: string | undefined): string | undefined {
  if (offsetRotate == null || offsetRotate.trim() === "") return undefined;
  const t = offsetRotate.trim().toLowerCase();
  if (t === "auto" || t === "reverse") return undefined;
  if (t === "0deg" || t === "0") return "0";
  return offsetRotate.trim();
}

/**
 * Pads the path bbox slightly, then expands the viewBox so its aspect ratio matches
 * the container. That way `preserveAspectRatio="xMidYMid meet"` fills edge-to-edge
 * without horizontal letterboxing on wide strips.
 */
function viewBoxMatchingContainerAspect(
  bbox: Pick<DOMRect, "x" | "y" | "width" | "height">,
  containerW: number,
  containerH: number
): string {
  const pad = Math.max(1, Math.min(bbox.width, bbox.height) * 0.02);
  let vx = bbox.x - pad;
  let vy = bbox.y - pad;
  let vw = bbox.width + 2 * pad;
  let vh = bbox.height + 2 * pad;

  if (containerW > 1 && containerH > 1) {
    const cr = containerW / containerH;
    const vr = vw / vh;
    if (vr > cr + 1e-6) {
      const newVh = vw / cr;
      vy -= (newVh - vh) / 2;
      vh = newVh;
    } else if (vr < cr - 1e-6) {
      const newVw = vh * cr;
      vx -= (newVw - vw) / 2;
      vw = newVw;
    }
  }

  return `${vx} ${vy} ${vw} ${vh}`;
}

function marqueeTypographyClass(level: Props["level"], variant: Props["variant"]): string {
  if (level != null) return getHeadingTypographyClass(level);
  if (variant === "label") return getBodyTypographyClass(6);
  if (variant === "section") return getHeadingTypographyClass(3);
  if (variant === "display") return getHeadingTypographyClass(2);
  return "";
}

export function ElementMarquee({
  id,
  text,
  variableKey,
  direction = "left",
  speed = 12,
  gap = `${globals.uiMarqueeDefaultGapPx}px`,
  pauseOnHover,
  pauseOnFocus,
  gradientEdges,
  gradientWidth,
  gradientColor,
  autoFill,
  reverseOnEnd,
  followPath,
  level,
  variant,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  color,
  textFill,
  rotate,
  flipHorizontal,
  flipVertical,
  width,
  height,
  selfAlign,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  layer,
  constraints,
  effects,
  interactions,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  bgBlur,
  hidden,
}: Props) {
  const variableValue = useVariable(variableKey ?? "");
  const resolvedText = variableKey !== undefined ? String(variableValue ?? "") : (text ?? "");

  const axis = direction === "left" || direction === "right" ? "X" : "Y";
  const reverse = direction === "right" || direction === "down";
  /** Resolved blocks always get a stable `id` from `resolveSectionContentBlockElements`; use for @keyframes + <style key>. */
  const reactFallback = useId().replace(/:/g, "");
  const animSuffix = String(id ?? reactFallback).replace(/[^a-zA-Z0-9-_]/g, "-");
  const linearKeyframesName = `marquee-linear-${animSuffix}`;
  const pathCurveId = `pb-marquee-path-${animSuffix}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const svgPathRef = useRef<SVGPathElement>(null);
  const svgTextRef = useRef<SVGTextElement>(null);
  const svgTextPathRef = useRef<SVGTextPathElement>(null);
  const pathAnimRef = useRef<{ paused: boolean; raf: number }>({ paused: false, raf: 0 });
  const [cloneCount, setCloneCount] = useState(2);
  const [periodPx, setPeriodPx] = useState<number | null>(null);
  const [pathViewBox, setPathViewBox] = useState("0 0 1600 96");
  const [pathSegmentLen, setPathSegmentLen] = useState(0);
  const [pathFontSizePx, setPathFontSizePx] = useState<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isAfterLcp = useAfterLcp();
  /** Defer painted ticker until after LCP so a wide strip is unlikely to become the LCP element. */
  const showAnimatedMarquee = prefersReducedMotion || isAfterLcp;

  useInsertionEffect(() => {
    if (followPath?.d) return;
    const name = linearKeyframesName;
    const css =
      axis === "X"
        ? `@keyframes ${name}{from{transform:translate3d(0,0,0)}to{transform:translate3d(calc(${reverse ? "" : "-"}1 * var(--pb-marquee-period, 0px)),0,0)}}`
        : `@keyframes ${name}{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,calc(${reverse ? "" : "-"}1 * var(--pb-marquee-period, 0px)),0)}}`;
    const el = document.createElement("style");
    el.setAttribute("data-pb-marquee-kf", name);
    el.textContent = css;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [followPath?.d, linearKeyframesName, axis, reverse]);

  useLayoutEffect(() => {
    if (followPath?.d || prefersReducedMotion || !isAfterLcp) return;

    let raf = 0;
    const measure = () => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track || track.children.length < 2) return;
      const c0 = track.children[0] as HTMLElement;
      const c1 = track.children[1] as HTMLElement;
      const period = axis === "X" ? c1.offsetLeft - c0.offsetLeft : c1.offsetTop - c0.offsetTop;
      if (!Number.isFinite(period) || period <= 0) {
        setPeriodPx(null);
        return;
      }
      const span = axis === "X" ? container.clientWidth : container.clientHeight;
      const clones = autoFill !== false ? Math.max(2, Math.ceil(span / period) + 2) : 2;
      setPeriodPx(period);
      setCloneCount(clones);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(schedule);
    ro.observe(container);
    const track = trackRef.current;
    if (track) ro.observe(track);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [
    followPath?.d,
    axis,
    resolvedText,
    gap,
    autoFill,
    fontSize,
    fontWeight,
    letterSpacing,
    fontFamily,
    level,
    variant,
    prefersReducedMotion,
    isAfterLcp,
  ]);

  const pathScrollContent = useMemo(() => {
    if (!resolvedText) return "";
    const tileSep = "  ·  ";
    return Array.from({ length: 28 }, () => `${resolvedText}${tileSep}`).join("");
  }, [resolvedText]);

  useLayoutEffect(() => {
    if (!followPath?.d || prefersReducedMotion || !isAfterLcp) return;

    const run = () => {
      const pathEl = svgPathRef.current;
      const textEl = svgTextRef.current;
      const tp = svgTextPathRef.current;
      const container = containerRef.current;
      if (!pathEl) return;

      let glyphPadY = 0;
      let measuredFontSize: number | null = null;

      try {
        const b = pathEl.getBBox();
        const cw = container?.clientWidth ?? 0;
        const ch = container?.clientHeight ?? 0;

        if (textEl && cw > 0 && ch > 0) {
          const previousFontSize = textEl.style.fontSize;
          textEl.style.fontSize = fontSize !== undefined ? String(fontSize) : "";
          const computedFontSize = Number.parseFloat(getComputedStyle(textEl).fontSize);
          textEl.style.fontSize = previousFontSize;
          if (Number.isFinite(computedFontSize) && computedFontSize > 0) {
            measuredFontSize = computedFontSize;
            const approxScale = Math.min(cw / b.width, ch / b.height);
            glyphPadY = (computedFontSize * 0.6) / Math.max(approxScale, 0.01);
          }
        }

        const expandedBBox = {
          x: b.x,
          y: b.y - glyphPadY,
          width: b.width,
          height: b.height + 2 * glyphPadY,
        };

        const nextViewBox = viewBoxMatchingContainerAspect(expandedBBox, cw, ch);
        setPathViewBox(nextViewBox);

        const viewBoxParts = nextViewBox.split(/\s+/).map(Number);
        const vw = viewBoxParts[2];
        const vh = viewBoxParts[3];
        const scale =
          vw !== undefined && vh !== undefined ? Math.min(cw / vw, ch / vh) : Number.NaN;
        if (measuredFontSize !== null && Number.isFinite(scale) && scale > 0.05) {
          setPathFontSizePx(measuredFontSize / scale);
        }
      } catch (err) {
        console.warn(
          "[pb-runtime-react] Failed to parse SVG path for marquee fontSize scaling",
          err
        );
      }

      if (tp && resolvedText) {
        const full = tp.textContent ?? "";
        const probe = `${resolvedText}  ·  `;
        tp.textContent = probe;
        const seg = tp.getComputedTextLength();
        tp.textContent = full;
        if (Number.isFinite(seg) && seg > 0) setPathSegmentLen(seg);
      }
    };

    const container = containerRef.current;
    if (container) {
      const ro = new ResizeObserver(() => {
        requestAnimationFrame(run);
      });
      ro.observe(container);
      requestAnimationFrame(run);
      return () => {
        ro.disconnect();
      };
    }

    requestAnimationFrame(run);
    return undefined;
  }, [
    followPath?.d,
    prefersReducedMotion,
    resolvedText,
    pathScrollContent,
    isAfterLcp,
    fontSize,
    level,
    variant,
  ]);

  useEffect(() => {
    if (!followPath?.d || prefersReducedMotion || pathSegmentLen <= 0 || !isAfterLcp) return;
    const tp = svgTextPathRef.current;
    if (!tp) return;
    const animState = pathAnimRef.current;
    let accum = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const textPathEl = svgTextPathRef.current;
      if (!textPathEl) {
        pathAnimRef.current.raf = requestAnimationFrame(loop);
        return;
      }
      if (!animState.paused) {
        accum += (now - last) / 1000;
      }
      last = now;
      const dist = (accum * speed) % pathSegmentLen;
      const offset = reverse ? dist : -dist;
      textPathEl.setAttribute("startOffset", `${offset}px`);
      animState.raf = requestAnimationFrame(loop);
    };
    animState.raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animState.raf);
    };
  }, [followPath?.d, prefersReducedMotion, pathSegmentLen, speed, reverse, isAfterLcp]);

  const dirLabel = reverse ? "reverse" : "normal";
  const gradientEdge =
    (gradientColor as string) ??
    `var(--color-background, ${globals.colorMarqueeGradientEdgeFallback})`;

  const resolvedTextFill = lowerThemeStringToCss(textFill?.value);
  const resolvedColor = lowerThemeStringToCss(color);
  const resolvedFontFamily = resolveFontFamily(fontFamily);

  const textStyle: CSSProperties = {
    letterSpacing: letterSpacing as CSSProperties["letterSpacing"],
    ...(resolvedFontFamily !== undefined ? { fontFamily: resolvedFontFamily } : {}),
    ...(fontSize !== undefined ? { fontSize: fontSize as CSSProperties["fontSize"] } : {}),
    ...(fontWeight !== undefined ? { fontWeight: fontWeight as CSSProperties["fontWeight"] } : {}),
  };

  if (textFill?.type === "gradient" && resolvedTextFill) {
    textStyle.backgroundImage = resolvedTextFill;
    textStyle.backgroundClip = "text";
    textStyle.WebkitBackgroundClip = "text";
    textStyle.color = "transparent";
    (textStyle as Record<string, unknown>).WebkitTextFillColor = "transparent";
  } else if (textFill?.type === "color" && resolvedTextFill) {
    textStyle.color = resolvedTextFill;
  } else if (resolvedColor !== undefined) {
    textStyle.color = resolvedColor;
  }

  const typoClass = marqueeTypographyClass(level, variant);

  const layout = {
    width: width as string | undefined,
    height: height as string | undefined,
    align: selfAlign as "left" | "center" | "right" | undefined,
    marginTop: marginTop as string | undefined,
    marginBottom: marginBottom as string | undefined,
    marginLeft: marginLeft as string | undefined,
    marginRight: marginRight as string | undefined,
    zIndex: layer,
    constraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    bgBlur,
    hidden,
  };

  const pathBoxHeight = followPath?.height ?? "7.5rem";
  const pathMinHeight =
    typeof height === "string" && height !== "hug" && height !== "fill" && height !== "full"
      ? height
      : pathBoxHeight;
  const pathTextRotate = svgTextRotateForPath(followPath?.offsetRotate);

  const svgFill =
    textFill?.type === "gradient"
      ? (resolvedColor ?? "currentColor")
      : textFill?.type === "color" && resolvedTextFill
        ? resolvedTextFill
        : typeof textStyle.color === "string"
          ? textStyle.color
          : (resolvedColor ?? "currentColor");

  const pauseTrack = (paused: boolean) => {
    pathAnimRef.current.paused = paused;
    const root = containerRef.current;
    if (!root) return;
    root.querySelectorAll(".marquee-track").forEach((node) => {
      (node as HTMLElement).style.animationPlayState = paused ? "paused" : "running";
    });
  };

  const linearItems = Array.from({ length: cloneCount }, (_, i) => i);

  const canAnimateLinear =
    !prefersReducedMotion && periodPx != null && periodPx > 0 && resolvedText.length > 0;

  const trackFlexStyle: CSSProperties =
    axis === "X"
      ? { flexDirection: "row", width: "max-content" }
      : { flexDirection: "column", height: "max-content", alignItems: "flex-start" };

  return (
    <ElementLayoutWrapper
      layout={layout}
      interactions={interactions}
      transform={{ rotate, flipHorizontal, flipVertical }}
      overflow="visible"
    >
      {/* ElementLayoutWrapper inner flex uses align-items:center — stretch so width/max-content track can scroll */}
      <div
        className="w-full min-w-0 self-stretch"
        style={
          axis === "Y"
            ? {
                minHeight: 0,
                alignSelf: "stretch",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }
            : undefined
        }
      >
        {!showAnimatedMarquee ? (
          // SSR / pre-LCP: render the text content so crawlers and users see something
          // instead of an empty box. The animated version replaces this after LCP.
          <div
            ref={containerRef}
            className="w-full min-w-0 shrink-0 overflow-hidden select-none"
            style={
              followPath?.d
                ? { minHeight: pathMinHeight, height: pathMinHeight }
                : { minHeight: "2.75rem" }
            }
          >
            <span className={typoClass ? `shrink-0 ${typoClass}` : "shrink-0"} style={textStyle}>
              {resolvedText}
            </span>
          </div>
        ) : followPath?.d ? (
          prefersReducedMotion ? (
            <div
              ref={containerRef}
              className="relative flex w-full items-center justify-center overflow-hidden select-none px-2"
              style={{ minHeight: pathMinHeight }}
            >
              <span className={typoClass || undefined} style={textStyle}>
                {resolvedText}
              </span>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative w-full overflow-hidden select-none"
              style={{ minHeight: pathMinHeight, height: pathMinHeight }}
              tabIndex={pauseOnFocus ? 0 : undefined}
              onFocus={
                pauseOnFocus
                  ? () => {
                      pauseTrack(true);
                    }
                  : undefined
              }
              onBlur={
                pauseOnFocus
                  ? () => {
                      pauseTrack(false);
                    }
                  : undefined
              }
              onMouseEnter={pauseOnHover ? () => pauseTrack(true) : undefined}
              onMouseLeave={pauseOnHover ? () => pauseTrack(false) : undefined}
            >
              <svg
                className="block w-full select-none"
                style={{ minHeight: pathMinHeight, height: pathMinHeight }}
                viewBox={pathViewBox}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden
              >
                <defs>
                  <path
                    ref={svgPathRef}
                    id={pathCurveId}
                    d={followPath.d}
                    fill="none"
                    stroke="none"
                  />
                </defs>
                <text
                  ref={svgTextRef}
                  {...(pathTextRotate !== undefined ? { rotate: pathTextRotate } : {})}
                  className={typoClass || undefined}
                  style={{
                    letterSpacing: letterSpacing as CSSProperties["letterSpacing"],
                    ...(resolvedFontFamily !== undefined ? { fontFamily: resolvedFontFamily } : {}),
                    ...(pathFontSizePx != null
                      ? { fontSize: `${pathFontSizePx}px` }
                      : fontSize !== undefined
                        ? { fontSize: String(fontSize) }
                        : {}),
                    ...(fontWeight !== undefined
                      ? { fontWeight: fontWeight as CSSProperties["fontWeight"] }
                      : {}),
                    fill: svgFill,
                  }}
                  dominantBaseline="middle"
                >
                  <textPath
                    ref={svgTextPathRef}
                    href={`#${pathCurveId}`}
                    method="align"
                    spacing="auto"
                    startOffset="0px"
                  >
                    {pathScrollContent}
                  </textPath>
                </text>
              </svg>
            </div>
          )
        ) : prefersReducedMotion ? (
          <div
            ref={containerRef}
            className="relative flex w-full justify-center overflow-hidden select-none py-0.5"
            tabIndex={pauseOnFocus ? 0 : undefined}
          >
            <span className={typoClass ? `shrink-0 ${typoClass}` : "shrink-0"} style={textStyle}>
              {resolvedText}
            </span>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden select-none"
            style={axis === "Y" ? { flex: "1 1 0%", minHeight: 0 } : undefined}
            tabIndex={pauseOnFocus ? 0 : undefined}
            onFocus={
              pauseOnFocus
                ? (e) => {
                    const track = e.currentTarget.querySelector(".marquee-track") as HTMLDivElement;
                    if (track) track.style.animationPlayState = "paused";
                  }
                : undefined
            }
            onBlur={
              pauseOnFocus
                ? (e) => {
                    const track = e.currentTarget.querySelector(".marquee-track") as HTMLDivElement;
                    if (track) track.style.animationPlayState = "running";
                  }
                : undefined
            }
          >
            <div
              ref={trackRef}
              className={`marquee-track flex flex-nowrap will-change-transform ${axis === "X" ? "items-center" : "items-start"}`}
              style={{
                ...trackFlexStyle,
                gap,
                ...(canAnimateLinear
                  ? {
                      ["--pb-marquee-period" as string]: `${periodPx}px`,
                      animationName: linearKeyframesName,
                      animationDuration: `${periodPx / Math.max(speed, 0.01)}s`,
                      animationTimingFunction: "linear",
                      animationIterationCount: "infinite",
                      animationDirection: reverseOnEnd
                        ? ("alternate" as const)
                        : (dirLabel as CSSProperties["animationDirection"]),
                      animationPlayState: "running",
                    }
                  : { animationName: "none" }),
              }}
              onMouseEnter={
                pauseOnHover
                  ? (e) => {
                      (e.currentTarget as HTMLDivElement).style.animationPlayState = "paused";
                    }
                  : undefined
              }
              onMouseLeave={
                pauseOnHover
                  ? (e) => {
                      (e.currentTarget as HTMLDivElement).style.animationPlayState = "running";
                    }
                  : undefined
              }
            >
              {linearItems.map((i) => (
                <span
                  key={i}
                  className={typoClass ? `shrink-0 ${typoClass}` : "shrink-0"}
                  style={textStyle}
                >
                  {resolvedText}
                </span>
              ))}
            </div>
            {gradientEdges && axis === "X" ? (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0 z-[var(--pb-z-raised)] pointer-events-none"
                  style={{
                    width: gradientWidth ?? `${globals.uiMarqueeDefaultGapPx}px`,
                    background: `linear-gradient(to right, ${gradientEdge}, transparent)`,
                  }}
                />
                <div
                  className="absolute right-0 top-0 bottom-0 z-[var(--pb-z-raised)] pointer-events-none"
                  style={{
                    width: gradientWidth ?? `${globals.uiMarqueeDefaultGapPx}px`,
                    background: `linear-gradient(to left, ${gradientEdge}, transparent)`,
                  }}
                />
              </>
            ) : null}
            {gradientEdges && axis === "Y" ? (
              <>
                <div
                  className="absolute left-0 right-0 top-0 z-[var(--pb-z-raised)] pointer-events-none"
                  style={{
                    height: gradientWidth ?? `${globals.uiMarqueeDefaultGapPx}px`,
                    background: `linear-gradient(to bottom, ${gradientEdge}, transparent)`,
                  }}
                />
                <div
                  className="absolute left-0 right-0 bottom-0 z-[var(--pb-z-raised)] pointer-events-none"
                  style={{
                    height: gradientWidth ?? `${globals.uiMarqueeDefaultGapPx}px`,
                    background: `linear-gradient(to top, ${gradientEdge}, transparent)`,
                  }}
                />
              </>
            ) : null}
          </div>
        )}
      </div>
    </ElementLayoutWrapper>
  );
}
