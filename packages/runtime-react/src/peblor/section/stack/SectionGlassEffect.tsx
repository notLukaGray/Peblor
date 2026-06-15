"use client";

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import type { SectionEffect } from "@pb/contracts/types";
import { GlassFilter } from "./GlassFilter";
import { GlassClipPath } from "./GlassClipPath";
import {
  blurToMobileFallbackPx,
  liftNormalizedBlur,
  normalizeBezelType,
  parseLength,
  parsePx,
  readElementDimensions,
  readGlassOverlaySyncedDimensions,
  withGlassPhysicsClamped,
  type GlassDimensions,
} from "./glass-effect-utils";
import { clamp } from "../../elements/Shared/css-declaration-utils";
import {
  detectClientPlatformSnapshot,
  getSupportsBackdropFilterUrlClientSnapshot,
  type ClientPlatform,
} from "@pb/runtime-react/core/lib/platform-runtime";
import { lowerThemeValueDeep } from "@/peblor/theme/theme-string";

type GlassEffect = Extract<SectionEffect, { type: "glass" }>;
type GlassRuntimeSnapshot = {
  supportsBackdropUrl: boolean;
  fallbackPlatform: ClientPlatform;
  ready: boolean;
};
const glassRuntimeListeners = new Set<() => void>();
let glassRuntimeSnapshot: GlassRuntimeSnapshot = {
  supportsBackdropUrl: false,
  fallbackPlatform: "other",
  ready: false,
};

type SectionGlassEffectProps = {
  effects?: SectionEffect[];
  sectionRef?: RefObject<HTMLElement | null>;
  isSectionFixed?: boolean;
  variant?: "rich" | "minimal" | "auto";
  /**
   * When set, the glass layer uses this exact `border-radius` CSS (same string as the host
   * surface) and filter sizing reads from the painted overlay so bezel math matches the curve.
   */
  syncBorderRadius?: string;
};

function resolveGlassEffect(effects?: SectionEffect[]): GlassEffect | null {
  if (!Array.isArray(effects)) return null;
  for (const effect of effects) {
    if (effect.type === "glass") return effect;
  }
  return null;
}

function subscribeGlassRuntime(listener: () => void): () => void {
  glassRuntimeListeners.add(listener);
  return () => glassRuntimeListeners.delete(listener);
}

function getGlassRuntimeSnapshot(): GlassRuntimeSnapshot {
  return glassRuntimeSnapshot;
}

/**
 * Server-side snapshot for useSyncExternalStore.
 *
 * Must return a VALUE-PER-STABLE reference that is identical between SSR and
 * client hydration.  A frozen module constant satisfies this because the
 * server-side state never changes (no browser APIs are available during SSR),
 * and React compares the result of this function across the two phases using
 * Object.is — any difference triggers a hydration mismatch warning.
 *
 * React only calls this function during SSR and during client hydration; after
 * hydration completes, useSyncExternalStore uses `getGlassRuntimeSnapshot`
 * (the live module-global state) exclusively.
 */
const glassRuntimeServerSnapshot: Readonly<GlassRuntimeSnapshot> = {
  supportsBackdropUrl: false,
  fallbackPlatform: "other",
  ready: false,
};

function getGlassRuntimeServerSnapshot(): GlassRuntimeSnapshot {
  return glassRuntimeServerSnapshot;
}

function refreshGlassRuntimeSnapshot(): void {
  const nextSnapshot: GlassRuntimeSnapshot = {
    supportsBackdropUrl: getSupportsBackdropFilterUrlClientSnapshot(),
    fallbackPlatform: detectClientPlatformSnapshot(),
    ready: true,
  };
  if (
    nextSnapshot.supportsBackdropUrl === glassRuntimeSnapshot.supportsBackdropUrl &&
    nextSnapshot.fallbackPlatform === glassRuntimeSnapshot.fallbackPlatform &&
    nextSnapshot.ready === glassRuntimeSnapshot.ready
  ) {
    return;
  }
  glassRuntimeSnapshot = nextSnapshot;
  for (const listener of glassRuntimeListeners) listener();
}

function useGlassRuntimeSnapshot(): GlassRuntimeSnapshot {
  return useSyncExternalStore(
    subscribeGlassRuntime,
    getGlassRuntimeSnapshot,
    getGlassRuntimeServerSnapshot
  );
}

/**
 * Renders a physics-based CSS/SVG glass effect on its parent element.
 *
 * Uses an SVG <filter> applied via `backdrop-filter: url(#id)` — fully live,
 * works with video and all content, no snapshots, no WebGL.
 *
 * Non-rectangular shapes (Polygon, Star, Ellipse, custom Vector) are clipped
 * via an SVG <clipPath clipPathUnits="objectBoundingBox"> that scales correctly
 * to any rendered element size.
 *
 * Based on kube.io's liquid-glass-css-svg approach (Snell's law refraction).
 */
export function SectionGlassEffect({
  effects,
  sectionRef,
  isSectionFixed: _isSectionFixed = false,
  variant: _variant = "rich",
  syncBorderRadius,
}: SectionGlassEffectProps) {
  const resolvedEffects = useMemo(
    () => lowerThemeValueDeep(effects) as SectionEffect[] | undefined,
    [effects]
  );
  const glass = useMemo(() => resolveGlassEffect(resolvedEffects), [resolvedEffects]);
  const runtimeSnapshot = useGlassRuntimeSnapshot();
  const runtimeReady = runtimeSnapshot.ready;
  const fallbackPlatform = runtimeSnapshot.fallbackPlatform;
  const supportsBackdropUrl = runtimeSnapshot.supportsBackdropUrl;
  const isMobilePlatform = fallbackPlatform === "ios" || fallbackPlatform === "android";
  const shouldUseFallback = runtimeReady && (fallbackPlatform !== "other" || !supportsBackdropUrl);
  const shouldRenderFilter = runtimeReady && !shouldUseFallback && supportsBackdropUrl;
  const rawId = useId();
  const filterId = `pb-glass-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const clipPathId = `pb-glass-clip-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const [dims, setDims] = useState<GlassDimensions | null>(null);
  const observingRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    refreshGlassRuntimeSnapshot();
  }, []);

  useLayoutEffect(() => {
    if (!glass) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let rafRetry = 0;
    let rafCatchup = 0;
    let retryFrames = 0;
    // RAF-batched setDims: coalesce multiple resize observations into one update per frame.
    let measureRaf = 0;
    let pendingMeasure: (() => void) | null = null;

    const sync =
      typeof syncBorderRadius === "string" && syncBorderRadius.trim().length > 0
        ? syncBorderRadius.trim()
        : undefined;

    const scheduleMeasure = (fn: () => void): void => {
      pendingMeasure = fn;
      if (!measureRaf) {
        measureRaf = window.requestAnimationFrame(() => {
          measureRaf = 0;
          if (cancelled || !pendingMeasure) return;
          pendingMeasure();
          pendingMeasure = null;
        });
      }
    };

    const measure = (
      target: HTMLElement,
      preMeasuredWidth?: number,
      preMeasuredHeight?: number
    ): void => {
      if (cancelled) return;
      const overlay = overlayRef.current;
      const raw =
        sync && overlay
          ? readGlassOverlaySyncedDimensions(target, overlay, preMeasuredWidth, preMeasuredHeight)
          : readElementDimensions(target, preMeasuredWidth, preMeasuredHeight);
      setDims(withGlassPhysicsClamped(raw));
    };

    const attach = (target: HTMLElement): void => {
      if (cancelled) return;
      observingRef.current = target;
      ro?.disconnect();
      // Initial measurement: no pre-measured dimensions available yet.
      const initialMeasure = () => measure(target);
      initialMeasure();
      ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        const entry = entries[0];
        if (entry && entry.borderBoxSize?.[0]) {
          const { inlineSize, blockSize } = entry.borderBoxSize[0];
          scheduleMeasure(() => measure(target, inlineSize, blockSize));
        } else {
          scheduleMeasure(() => measure(target));
        }
      });
      ro.observe(target);
      const overlay = overlayRef.current;
      if (sync && overlay) {
        try {
          ro.observe(overlay);
        } catch (err) {
          console.warn(
            "[pb-runtime-react] ResizeObserver.observe(overlay) threw (engine limitation)",
            err
          );
        }
      }
      // Overlay only exists after the first successful `dims` read clears the early `return null`.
      // Re-measure on the next frame so `syncBorderRadius` + overlay geometry match Chromium.
      window.cancelAnimationFrame(rafCatchup);
      rafCatchup = window.requestAnimationFrame(() => {
        if (cancelled || !ro) return;
        const overlay2 = overlayRef.current;
        if (sync && overlay2) {
          try {
            ro.observe(overlay2);
          } catch (err) {
            console.warn(
              "[pb-runtime-react] ResizeObserver.observe(overlay2) threw (engine limitation)",
              err
            );
          }
        }
        scheduleMeasure(() => measure(target));
      });
    };

    const tryAttach = (): boolean => {
      const target = sectionRef?.current;
      if (!target) return false;
      attach(target);
      return true;
    };

    if (!tryAttach()) {
      // RAF retry loop: the sectionRef may not yet be attached to the DOM when this
      // layout effect runs (React refs are set asynchronously relative to useLayoutEffect).
      // Retrying over ~10 frames (~160ms at ~60fps) covers:
      //   - Server components that need a client island to mount first
      //   - Section wrappers with conditional rendering (visibleWhen / triggers)
      //   - Nested overlays where the host container mounts after the effect fires
      // Without this retry, `dims` would stay null, glass would be invisible, and
      // users would see an un-styled surface until a window resize triggers a fix.
      const retry = () => {
        if (cancelled) return;
        if (tryAttach()) return;
        if (retryFrames++ > 120) return;
        rafRetry = window.requestAnimationFrame(retry);
      };
      rafRetry = window.requestAnimationFrame(retry);
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafRetry);
      window.cancelAnimationFrame(rafCatchup);
      window.cancelAnimationFrame(measureRaf);
      ro?.disconnect();
      observingRef.current = null;
    };
  }, [glass, sectionRef, syncBorderRadius]);

  if (!glass || !dims || dims.width < 2 || dims.height < 2) return null;

  // --- Translate Figma-semantic fields to physics params ---
  const specularAngle =
    glass.lightAngle !== undefined ? (glass.lightAngle * Math.PI) / 180 : undefined;
  const derivedRefractiveIndex = glass.refraction !== undefined ? 1 + glass.refraction : undefined;
  const derivedBlur = glass.frost !== undefined ? Math.max(parsePx(glass.frost), 0) : undefined;
  const derivedSpecularOpacity = glass.lightIntensity;
  const dispersionScale = glass.dispersion ?? 0;

  // --- Map to physics params ---
  const halfMin = Math.min(dims.width, dims.height) / 2;
  // splay: tentative bezelWidth spread multiplier (0→1 = 1×→1.5×). Flagged for review.
  const splayMultiplier = glass.splay !== undefined ? 1 + glass.splay * 0.5 : 1;
  const bezelWidth = clamp(
    parseLength(glass.bezelWidth, halfMin, halfMin * 0.16) * splayMultiplier,
    1,
    Math.max(dims.radius * 0.9, 4)
  );
  const glassThickness = Math.max(parseLength(glass.glassThickness, 1200, 90), 1);
  const refractiveIndex = clamp(
    parsePx(glass.refractiveIndex, derivedRefractiveIndex ?? 1.5),
    1,
    5
  );
  const blur = Math.max(
    parseLength(glass.blur !== undefined ? glass.blur : (derivedBlur ?? 0), 1, 0),
    0
  );
  const blurWithMobileFloor = isMobilePlatform ? liftNormalizedBlur(blur, 0.05) : blur;
  const specularOpacity = clamp(
    parsePx(glass.specularOpacity, derivedSpecularOpacity ?? 0.9),
    0,
    2
  );
  const specularSaturation = Math.max(parsePx(glass.specularSaturation, 4), 0);
  const scaleRatio = Math.max(parsePx(glass.scaleRatio, 1), 0.001);
  const magnifyingScale = Math.max(parsePx(glass.magnifyingScale, 0), 0);
  const bezelType = normalizeBezelType(glass.bezelType);
  const shadow = glass.dropShadow !== false;
  const hasClipPath = !!glass.clipPath;
  const customShapeBoost = hasClipPath ? 1.3 : 1;

  // Chromium: full SVG displacement filter.
  // Safari / Firefox / iOS Chrome / Android Chrome: faked via enhanced standard CSS.
  const fallbackProfile =
    fallbackPlatform === "ios"
      ? {
          blurBase: 20,
          blurScale: 9.2,
          blurMin: 18,
          saturateScale: 0.1,
          saturateBias: 0.18,
          saturateMax: 2.6,
          brightnessScale: 0.08,
          brightnessMax: 1.2,
          contrastScale: 0.09,
          contrastMax: 1.18,
          hueRotateScale: 6.5,
        }
      : fallbackPlatform === "android"
        ? {
            blurBase: 16,
            blurScale: 8.8,
            blurMin: 16,
            saturateScale: 0.12,
            saturateBias: 0.12,
            saturateMax: 2.8,
            brightnessScale: 0.06,
            brightnessMax: 1.18,
            contrastScale: 0.1,
            contrastMax: 1.2,
            hueRotateScale: 5,
          }
        : {
            blurBase: 10,
            blurScale: 8,
            blurMin: 10,
            saturateScale: 0.12,
            saturateBias: 0.2,
            saturateMax: 3,
            brightnessScale: 0.06,
            brightnessMax: 1.2,
            contrastScale: 0.1,
            contrastMax: 1.24,
            hueRotateScale: 6,
          };
  const fallbackBlurPx = isMobilePlatform
    ? blurToMobileFallbackPx(blur, {
        floor: 0.05,
        minPx: fallbackPlatform === "ios" ? 2 : 1,
        maxPx: fallbackPlatform === "ios" ? 16 : 14,
        logStrength: fallbackPlatform === "ios" ? 3 : 2.8,
        referenceBlur: 4,
        curveExponent: 4,
        maxPxCap: fallbackPlatform === "ios" ? 18 : 16,
      })
    : Math.round(
        Math.max(
          blurWithMobileFloor * fallbackProfile.blurScale + fallbackProfile.blurBase,
          fallbackProfile.blurMin
        )
      );
  const fallbackSaturate = clamp(
    1 + specularSaturation * fallbackProfile.saturateScale + fallbackProfile.saturateBias,
    1,
    fallbackProfile.saturateMax
  ).toFixed(2);
  const fallbackBrightness = clamp(
    1 + (refractiveIndex - 1) * fallbackProfile.brightnessScale,
    1,
    fallbackProfile.brightnessMax
  ).toFixed(2);
  const fallbackContrast = clamp(
    1 + (refractiveIndex - 1) * fallbackProfile.contrastScale,
    1,
    fallbackProfile.contrastMax
  ).toFixed(2);
  const fallbackHueRotate =
    dispersionScale > 0.05
      ? ` hue-rotate(${(dispersionScale * fallbackProfile.hueRotateScale).toFixed(1)}deg)`
      : "";

  const backdropFilterValue = shouldUseFallback
    ? `blur(${fallbackBlurPx}px) saturate(${fallbackSaturate}) brightness(${fallbackBrightness}) contrast(${fallbackContrast})${fallbackHueRotate}`
    : `url(#${filterId})`;

  const lightAngleDeg = glass.lightAngle ?? 135;
  const lightAngleRad = (lightAngleDeg * Math.PI) / 180;
  const lightX = clamp(50 + Math.cos(lightAngleRad) * 34, 6, 94).toFixed(1);
  const lightY = clamp(50 - Math.sin(lightAngleRad) * 34, 6, 94).toFixed(1);
  const aspectRatio = clamp(dims.width / Math.max(dims.height, 1), 0.65, 1.85);
  const highlightWidth = Math.round(120 * aspectRatio);
  const highlightHeight = Math.round(115 / aspectRatio);
  const fallbackSpecularShadow = [
    `inset 0 1px 0 rgba(255,255,255,${(specularOpacity * 0.28).toFixed(2)})`,
    `inset 0 1.5px 3px rgba(255,255,255,${(specularOpacity * 0.1).toFixed(2)})`,
    `inset 0 -1px 0 rgba(0,0,0,${(specularOpacity * 0.04).toFixed(2)})`,
    `inset 1px 0 0 rgba(255,255,255,${(specularOpacity * 0.08).toFixed(2)})`,
    `inset -1px 0 0 rgba(0,0,0,${(specularOpacity * 0.02).toFixed(2)})`,
    `inset 0 0 0 0.5px rgba(255,255,255,${(specularOpacity * 0.14).toFixed(2)})`,
  ].join(", ");

  const fallbackGradient = !shouldUseFallback
    ? undefined
    : fallbackPlatform === "ios"
      ? [
          `radial-gradient(${highlightWidth}% ${highlightHeight}% at ${lightX}% ${lightY}%, rgba(255,255,255,${(specularOpacity * 0.12 * customShapeBoost).toFixed(2)}) 0%, rgba(255,255,255,0) 58%)`,
          `linear-gradient(${lightAngleDeg}deg, rgba(255,255,255,${(specularOpacity * 0.06 * customShapeBoost).toFixed(2)}) 0%, rgba(255,255,255,0.005) 50%, rgba(0,0,0,${(specularOpacity * 0.012 * customShapeBoost).toFixed(2)}) 100%)`,
        ].join(", ")
      : [
          `radial-gradient(${highlightWidth}% ${highlightHeight}% at ${lightX}% ${lightY}%, rgba(255,255,255,${(specularOpacity * 0.08 * customShapeBoost).toFixed(2)}) 0%, rgba(255,255,255,0) 56%)`,
          `linear-gradient(${lightAngleDeg}deg, rgba(255,255,255,${(specularOpacity * 0.04 * customShapeBoost).toFixed(2)}) 0%, rgba(255,255,255,0.004) 50%, rgba(0,0,0,${(specularOpacity * 0.01 * customShapeBoost).toFixed(2)}) 100%)`,
        ].join(", ");

  const fallbackBackgroundColor = hasClipPath
    ? fallbackPlatform === "ios"
      ? "rgba(255,255,255,0.05)"
      : "rgba(255,255,255,0.04)"
    : fallbackPlatform === "ios"
      ? "rgba(255,255,255,0.014)"
      : "rgba(255,255,255,0.01)";
  const fallbackBorderColor =
    fallbackPlatform === "ios"
      ? `rgba(255,255,255,${(specularOpacity * (hasClipPath ? 0.3 : 0.22)).toFixed(2)})`
      : `rgba(255,255,255,${(specularOpacity * (hasClipPath ? 0.24 : 0.16)).toFixed(2)})`;
  const fallbackOuterStrokeColor =
    fallbackPlatform === "ios"
      ? `rgba(255,255,255,${(specularOpacity * (hasClipPath ? 0.14 : 0.1)).toFixed(2)})`
      : `rgba(255,255,255,${(specularOpacity * (hasClipPath ? 0.1 : 0.07)).toFixed(2)})`;
  const baseGlassTint = `rgba(255,255,255,${(specularOpacity * 0.012).toFixed(3)})`;
  const nonShadowEdgeShell = `inset 0 0 0 0.5px rgba(255,255,255,${(specularOpacity * 0.18).toFixed(2)})`;

  const dropShadow =
    fallbackPlatform === "android"
      ? "0 10px 30px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.14)"
      : "0 8px 32px rgba(0,0,0,0.22), 0 1px 6px rgba(0,0,0,0.12)";
  const boxShadow = shouldUseFallback
    ? `${dropShadow}, ${fallbackSpecularShadow}`
    : `${dropShadow}, inset 0 1px 0 rgba(255,255,255,0.18)`;

  return (
    <>
      {hasClipPath && sectionRef && (
        <GlassClipPath
          id={clipPathId}
          clipPath={glass.clipPath!}
          clipRule={glass.clipRule}
          parentRef={sectionRef}
        />
      )}
      {shouldRenderFilter && (
        <GlassFilter
          id={filterId}
          width={dims.width}
          height={dims.height}
          radius={dims.radius}
          cornerRadii={dims.cornerRadii}
          bezelWidth={bezelWidth}
          bezelType={bezelType}
          glassThickness={glassThickness}
          refractiveIndex={refractiveIndex}
          blur={blurWithMobileFloor}
          scaleRatio={scaleRatio}
          specularOpacity={specularOpacity}
          specularSaturation={specularSaturation}
          magnifyingScale={magnifyingScale}
          specularAngle={specularAngle}
          dispersionScale={dispersionScale}
        />
      )}
      <div
        ref={overlayRef}
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: hasClipPath
            ? undefined
            : typeof syncBorderRadius === "string" && syncBorderRadius.trim().length > 0
              ? syncBorderRadius.trim()
              : "inherit",
          // Parent <figure> is already clipped by GlassClipPath. Avoid clipping the overlay again:
          // double clip-path can suppress backdrop-filter:url(#...) on Chromium.
          clipPath: undefined,
          ...(shouldUseFallback || shouldRenderFilter
            ? {
                backdropFilter: backdropFilterValue,
                WebkitBackdropFilter: backdropFilterValue,
              }
            : {}),
          backgroundColor: shouldUseFallback ? fallbackBackgroundColor : baseGlassTint,
          ...(shouldUseFallback ? { border: `1px solid ${fallbackBorderColor}` } : {}),
          ...(fallbackGradient ? { backgroundImage: fallbackGradient } : {}),
          ...(shouldUseFallback
            ? {
                outline: `1px solid ${fallbackOuterStrokeColor}`,
                outlineOffset: "-1px",
              }
            : {}),
          ...(shadow ? { boxShadow } : shouldUseFallback ? { boxShadow: nonShadowEdgeShell } : {}),
        }}
      />
    </>
  );
}
