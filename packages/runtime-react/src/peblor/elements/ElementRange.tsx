"use client";

import { useCallback, useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import type {
  ElementBlock,
  PeblorAction,
  SectionEffect,
  ThemeString,
} from "@pb/contracts/peblor/core/peblor-schemas";
import type { ElementLayoutTransformOptions } from "@pb/core/layout";
import type { ElementLayout } from "@pb/contracts/types";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { useVideoControlContext } from "./ElementVideo/VideoControlContext";
import { useAudioControlContext } from "./ElementAudio/AudioControlContext";
import { firePeblorProgressTrigger } from "@/peblor/triggers";
import { GlassFilter } from "@/peblor/section/stack/GlassFilter";
import {
  blurToMobileFallbackPx,
  liftNormalizedBlur,
} from "@/peblor/section/stack/glass-effect-utils";
import {
  detectClientPlatformSnapshot,
  getSupportsBackdropFilterUrlClientSnapshot,
} from "@pb/runtime-react/core/lib/platform-runtime";
import { resolveThemeString, resolveThemeStyleObject } from "@/peblor/theme/theme-string";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";

type Props = Extract<ElementBlock, { type: "elementRange" }>;

type RangeRuntimeSnapshot = {
  supportsBackdropUrl: boolean;
  isMobilePlatform: boolean;
  ready: boolean;
};
const rangeRuntimeListeners = new Set<() => void>();
let rangeRuntimeSnapshot: RangeRuntimeSnapshot = {
  supportsBackdropUrl: false,
  isMobilePlatform: false,
  ready: false,
};

function subscribeRangeRuntime(listener: () => void): () => void {
  rangeRuntimeListeners.add(listener);
  return () => rangeRuntimeListeners.delete(listener);
}

function getRangeRuntimeSnapshot(): RangeRuntimeSnapshot {
  return rangeRuntimeSnapshot;
}

function getRangeRuntimeServerSnapshot(): RangeRuntimeSnapshot {
  return rangeRuntimeSnapshot;
}

function refreshRangeRuntimeSnapshot(): void {
  const fallbackPlatform = detectClientPlatformSnapshot();
  const nextSnapshot: RangeRuntimeSnapshot = {
    supportsBackdropUrl: getSupportsBackdropFilterUrlClientSnapshot(),
    isMobilePlatform: fallbackPlatform !== "other",
    ready: true,
  };
  if (
    nextSnapshot.supportsBackdropUrl === rangeRuntimeSnapshot.supportsBackdropUrl &&
    nextSnapshot.isMobilePlatform === rangeRuntimeSnapshot.isMobilePlatform &&
    nextSnapshot.ready === rangeRuntimeSnapshot.ready
  ) {
    return;
  }
  rangeRuntimeSnapshot = nextSnapshot;
  for (const listener of rangeRuntimeListeners) listener();
}

function useRangeRuntimeSnapshot(): RangeRuntimeSnapshot {
  return useSyncExternalStore(
    subscribeRangeRuntime,
    getRangeRuntimeSnapshot,
    getRangeRuntimeServerSnapshot
  );
}

type LayoutProps = Pick<
  ElementLayoutTransformOptions,
  "width" | "height" | "align" | "marginTop" | "marginBottom" | "marginLeft" | "marginRight"
> & {
  zIndex?: number;
  constraints?: ElementLayout["constraints"];
  [key: string]: unknown;
};

export function ElementRange({
  min = 0,
  max = 1,
  step = 0.01,
  defaultValue,
  ariaLabel,
  width,
  height,
  align,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex,
  constraints,
  effects,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  backdropFilter,
  hidden,
  action,
  actionPayload,
  disabled = false,
  style,
  interactions,
}: Props) {
  const themeMode = usePeblorThemeMode();
  const videoCtx = useVideoControlContext();
  const audioCtx = useAudioControlContext();
  /** Video module takes precedence if both contexts were ever nested (normally one applies). */
  const mediaCtx = videoCtx ?? audioCtx;
  const runtimeSnapshot = useRangeRuntimeSnapshot();
  const runtimeReady = runtimeSnapshot.ready;
  const supportsBackdropUrl = runtimeSnapshot.supportsBackdropUrl;
  const isMobilePlatform = runtimeSnapshot.isMobilePlatform;
  const effectiveSupportsBackdropUrl = runtimeReady && supportsBackdropUrl;
  const effectiveIsMobilePlatform = runtimeReady && isMobilePlatform;

  useEffect(() => {
    refreshRangeRuntimeSnapshot();
  }, []);
  const layout = {
    width,
    height,
    align,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    zIndex,
    constraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    backdropFilter,
    hidden,
  } as LayoutProps;

  const initialValue = Number.isFinite(defaultValue)
    ? Math.max(min, Math.min(max, defaultValue as number))
    : min;
  const [progress, setProgress] = useState(initialValue);
  const [isActive, setIsActive] = useState(false);
  const rawId = useId();
  const thumbFilterId = `pb-thumb-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const isVolume = action === "volume" && mediaCtx;
  const isSeek = action === "seek" && mediaCtx;
  const seekDuration = isSeek ? Math.max(0, mediaCtx.duration || 0) : 0;
  const seekRatio = isSeek && seekDuration > 0 ? (mediaCtx.currentTime || 0) / seekDuration : 0;
  const value = isVolume ? (mediaCtx.isMuted ? 0 : mediaCtx.volume) : isSeek ? seekRatio : progress;
  const isDisabled =
    disabled || (action === "volume" ? !isVolume : action === "seek" ? !isSeek : false);
  const valueRatio = max === min ? 0 : (value - min) / (max - min);
  const onVolumeChange = isVolume ? mediaCtx.onVolumeChange : undefined;
  const onSeekTo = isSeek ? mediaCtx.onSeekTo : undefined;

  const styleObj = (style ?? {}) as Record<string, unknown>;
  const {
    trackColor,
    fillColor,
    accentColor,
    trackHeight,
    thumbSize,
    thumbWidth,
    thumbHeight,
    borderRadius,
    thumbIdleScale,
    thumbActiveScale,
    thumbIdleOpacity,
    thumbActiveOpacity,
    glassOnThumb: glassOnThumbRaw,
    ...restStyle
  } = styleObj;

  const resolvedTrackColor = resolveThemeString(trackColor as ThemeString | undefined, themeMode);
  const resolvedFillColor = resolveThemeString(fillColor as ThemeString | undefined, themeMode);
  const resolvedAccentColor = resolveThemeString(accentColor as ThemeString | undefined, themeMode);
  const resolvedRestStyle = resolveThemeStyleObject(restStyle, themeMode);
  const use2Tone = typeof resolvedTrackColor === "string" && typeof resolvedFillColor === "string";
  const trackH = trackHeight as string | undefined;
  const thumbS = thumbSize as string | undefined;
  const thumbW = (thumbWidth as string | undefined) ?? thumbS;
  const thumbH = (thumbHeight as string | undefined) ?? thumbS;
  const radius = (borderRadius as string | undefined) ?? "9999px";
  const parseNumberish = (value: unknown, fallback: number): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = parseFloat(value);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  };
  const inactiveScale = parseNumberish(thumbIdleScale, 0.6);
  const activeScale = parseNumberish(thumbActiveScale, 1);
  const inactiveOpacity = parseNumberish(thumbIdleOpacity, 1);
  const activeOpacity = parseNumberish(thumbActiveOpacity, 0.1);
  const glassOnThumb = glassOnThumbRaw === true || glassOnThumbRaw === "true";
  const hasGlassEffect = (effects ?? []).some((effect) => effect.type === "glass");
  const thumbGlassEffect = useMemo<Extract<SectionEffect, { type: "glass" }> | undefined>(() => {
    if (!hasGlassEffect) return undefined;
    return (effects ?? []).find((e) => e.type === "glass") as
      | Extract<SectionEffect, { type: "glass" }>
      | undefined;
  }, [effects, hasGlassEffect]);

  // Compute glass filter params for direct application to thumb
  const thumbWpx = parseNumberish(thumbW, 90);
  const thumbHpx = parseNumberish(thumbH, 60);
  const thumbHalfMin = Math.min(thumbWpx, thumbHpx) / 2;
  const thumbGlassParams = useMemo(() => {
    if (!glassOnThumb || !thumbGlassEffect) return null;
    const g = thumbGlassEffect;
    const bezelWidthRaw =
      typeof g.bezelWidth === "number"
        ? g.bezelWidth
        : parseFloat(String(g.bezelWidth ?? "")) || thumbHalfMin * 0.16;
    const bezelWidth = Math.min(Math.max(bezelWidthRaw, 1), Math.max(thumbHalfMin * 0.9, 4));
    const glassThickness = Math.max(
      typeof g.glassThickness === "number"
        ? g.glassThickness
        : parseFloat(String(g.glassThickness ?? "")) || 90,
      1
    );
    const refractiveIndex = Math.min(Math.max(parseNumberish(g.refractiveIndex, 1.5), 1), 3);
    const blur = Math.max(parseNumberish(g.blur, 0), 0);
    const scaleRatio = Math.max(parseNumberish(g.scaleRatio, 1), 0.001);
    const specularOpacity = Math.min(Math.max(parseNumberish(g.specularOpacity, 0.9), 0), 1);
    const specularSaturation = Math.max(parseNumberish(g.specularSaturation, 4), 0);
    const magnifyingScale = Math.max(parseNumberish(g.magnifyingScale, 0), 0);
    const bezelTypeRaw = g.bezelType;
    const bezelType: "convex_circle" | "convex_squircle" | "concave" | "lip" =
      bezelTypeRaw === "convex_circle"
        ? "convex_circle"
        : bezelTypeRaw === "concave"
          ? "concave"
          : bezelTypeRaw === "lip"
            ? "lip"
            : "convex_squircle";
    return {
      bezelWidth,
      glassThickness,
      refractiveIndex,
      blur,
      scaleRatio,
      specularOpacity,
      specularSaturation,
      magnifyingScale,
      bezelType,
      dropShadow: g.dropShadow !== false,
    };
  }, [glassOnThumb, thumbGlassEffect, thumbHalfMin]);

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    // Height fills an explicit wrapper height when one is set; minHeight ensures the
    // container is at least as tall as the thumb so it doesn't collapse to zero when
    // no explicit height is provided in the block layout.
    height: "100%",
    minHeight: thumbH ?? trackH ?? "2rem",
    minWidth: 0,
    ...(resolvedRestStyle as React.CSSProperties),
  };

  const inputStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    margin: 0,
    opacity: 0,
    cursor: "pointer",
    zIndex: 1,
  };

  const canRenderCustom = use2Tone && trackH && thumbS && thumbW && thumbH;
  const layoutForWrapper =
    canRenderCustom && glassOnThumb && hasGlassEffect ? { ...layout, effects: undefined } : layout;

  const trackStyle: React.CSSProperties = canRenderCustom
    ? {
        position: "absolute",
        left: 0,
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        height: trackH,
        background: resolvedTrackColor,
        borderRadius: radius,
        pointerEvents: "none",
      }
    : {};

  const fillStyle: React.CSSProperties = canRenderCustom
    ? {
        position: "absolute",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        width: `${valueRatio * 100}%`,
        height: trackH,
        background: resolvedFillColor,
        borderRadius: radius,
        pointerEvents: "none",
      }
    : {};

  const thumbBackdropFilter = thumbGlassParams ? `url(#${thumbFilterId})` : undefined;
  const thumbBlurWithMobileFloor = thumbGlassParams
    ? effectiveIsMobilePlatform
      ? liftNormalizedBlur(thumbGlassParams.blur, 0.05)
      : thumbGlassParams.blur
    : undefined;
  const thumbFallbackBlurPx =
    thumbGlassParams == null
      ? undefined
      : effectiveIsMobilePlatform
        ? blurToMobileFallbackPx(thumbGlassParams.blur, {
            floor: 0.05,
            minPx: 1,
            maxPx: 9,
            logStrength: 2.6,
            referenceBlur: 4,
            curveExponent: 4,
            maxPxCap: 10,
          })
        : Math.round(Math.max((thumbBlurWithMobileFloor ?? thumbGlassParams.blur) * 8.8 + 14, 14));
  const thumbFallbackFilter = thumbGlassParams
    ? `blur(${thumbFallbackBlurPx ?? 14}px) saturate(${Math.min(1 + thumbGlassParams.specularSaturation * 0.1 + 0.16, 2.8).toFixed(2)}) brightness(${Math.min(1 + (thumbGlassParams.refractiveIndex - 1) * 0.06, 1.16).toFixed(2)}) contrast(${Math.min(1 + (thumbGlassParams.refractiveIndex - 1) * 0.1, 1.18).toFixed(2)})`
    : undefined;
  const resolvedThumbBackdropFilter = thumbGlassParams
    ? effectiveSupportsBackdropUrl
      ? thumbBackdropFilter
      : thumbFallbackFilter
    : undefined;
  const thumbShellOpacity = Math.min(
    isActive ? activeOpacity : inactiveOpacity,
    effectiveSupportsBackdropUrl ? 1 : 0.1
  );
  const thumbStyle: React.CSSProperties = canRenderCustom
    ? {
        position: "absolute",
        left: `calc(${valueRatio * 100}% - ${thumbW} / 2)`,
        top: "50%",
        transform: `translateY(-50%) scale(${isActive ? activeScale : inactiveScale})`,
        width: thumbW,
        height: thumbH,
        borderRadius: "9999px",
        boxShadow: thumbGlassParams?.dropShadow
          ? "0 4px 22px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.08)"
          : "0 3px 14px rgba(0,0,0,0.1)",
        ...(thumbGlassParams
          ? {
              border: "1px solid rgba(255,255,255,0.2)",
              outline: "1px solid rgba(255,255,255,0.08)",
              outlineOffset: "-1px",
            }
          : {}),
        transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: "none",
        overflow: "hidden",
        ...(resolvedThumbBackdropFilter
          ? {
              backdropFilter: resolvedThumbBackdropFilter,
              WebkitBackdropFilter: resolvedThumbBackdropFilter,
            }
          : {}),
      }
    : {};

  useEffect(() => {
    const onPointerUp = () => setIsActive(false);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      if (onVolumeChange) {
        onVolumeChange(v);
        return;
      }
      if (onSeekTo) {
        const ratio = max === min ? 0 : (v - min) / (max - min);
        onSeekTo(Math.max(0, Math.min(1, ratio)) * seekDuration);
        return;
      }
      setProgress(v);
      if (action) {
        const ratio = max === min ? 0 : (v - min) / (max - min);
        const normalizedProgress = Math.max(0, Math.min(1, ratio));
        firePeblorProgressTrigger(normalizedProgress, {
          type: action,
          payload: actionPayload ?? {},
        } as PeblorAction);
      }
    },
    [onVolumeChange, onSeekTo, action, actionPayload, min, max, seekDuration]
  );

  if (canRenderCustom) {
    return (
      <ElementLayoutWrapper
        layout={layoutForWrapper}
        overflow="visible"
        interactions={interactions}
      >
        <div style={containerStyle}>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            onPointerDown={() => setIsActive(true)}
            onMouseDown={() => setIsActive(true)}
            onTouchStart={() => setIsActive(true)}
            onPointerUp={() => setIsActive(false)}
            disabled={isDisabled}
            style={inputStyle}
            aria-label={ariaLabel ?? "Range"}
          />
          {thumbGlassParams && effectiveSupportsBackdropUrl && (
            <GlassFilter
              id={thumbFilterId}
              width={thumbWpx}
              height={thumbHpx}
              radius={thumbHalfMin}
              bezelWidth={thumbGlassParams.bezelWidth}
              bezelType={thumbGlassParams.bezelType}
              glassThickness={thumbGlassParams.glassThickness}
              refractiveIndex={thumbGlassParams.refractiveIndex}
              blur={thumbBlurWithMobileFloor ?? thumbGlassParams.blur}
              scaleRatio={thumbGlassParams.scaleRatio}
              specularOpacity={thumbGlassParams.specularOpacity}
              specularSaturation={thumbGlassParams.specularSaturation}
              magnifyingScale={thumbGlassParams.magnifyingScale}
            />
          )}
          <div style={trackStyle} />
          <div style={fillStyle} />
          <div style={thumbStyle}>
            {/* White background as a child so backdrop-filter on the thumb sees the scene, not white */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                background: `rgba(255,255,255,${thumbShellOpacity})`,
                transition: "background 180ms ease-out",
              }}
            />
          </div>
        </div>
      </ElementLayoutWrapper>
    );
  }

  const fallbackAccent = resolvedAccentColor ?? (use2Tone ? resolvedFillColor : undefined);

  return (
    <ElementLayoutWrapper layout={layout} overflow="visible" interactions={interactions}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        disabled={isDisabled}
        style={{
          width: "100%",
          minWidth: 0,
          ...(resolvedRestStyle as React.CSSProperties),
          ...(fallbackAccent ? { accentColor: fallbackAccent } : {}),
        }}
        className="w-full min-w-0"
        aria-label={ariaLabel ?? "Range"}
      />
    </ElementLayoutWrapper>
  );
}
