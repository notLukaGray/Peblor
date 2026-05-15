"use client";

import { useState, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import Image from "next/image";
import type { ElementBlock } from "@pb/contracts/types";
import { reconcileElementOrderWithDefinitions } from "@pb/core/modules";
import { generateElementKey } from "@pb/core/keys";
import { resolveThemeString } from "@/peblor/theme/theme-string";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { ElementRenderer } from "./Shared/ElementRenderer";

type Props = Extract<ElementBlock, { type: "elementImageCompare" }>;

export function ElementImageCompare({
  id,
  before,
  after,
  initialPosition = 0.5,
  direction = "horizontal",
  beforeLabel,
  afterLabel,
  labelPosition = "top",
  /** @deprecated No longer used — divider only moves while pointer is down (click/touch drag). */
  hoverActivate: _hoverActivate,
  keyboardStep,
  handleSize = "44px",
  handleColor,
  handleIcon = "arrow",
  dividerColor,
  dividerWidth = "2px",
  aspectRatio,
  handleElements,
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
  interactions,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  backdropFilter,
  hidden,
}: Props) {
  const themeMode = usePeblorThemeMode();
  const [position, setPosition] = useState(initialPosition);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const activePointerId = useRef<number | null>(null);

  const resolvedHandleColor = resolveThemeString(handleColor, themeMode);
  const resolvedDividerColor = resolveThemeString(dividerColor, themeMode);
  const handleFill = resolvedHandleColor ?? "#fff";
  const dividerFill = resolvedDividerColor;

  const [trackPx, setTrackPx] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const measure = () => {
      const r = root.getBoundingClientRect();
      const w = Math.max(0, Math.round(r.width));
      const h = Math.max(0, Math.round(r.height));
      setTrackPx((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  const handleBlocks = useMemo((): ElementBlock[] => {
    if (!handleElements?.definitions) return [];
    const definitions = handleElements.definitions as Record<string, unknown>;
    const order = reconcileElementOrderWithDefinitions(handleElements.elementOrder, definitions);
    const idCounts = new Map<string, number>();
    return order
      .map((key): ElementBlock | null => {
        const el = definitions[key] as unknown;
        if (
          !el ||
          typeof el !== "object" ||
          !("type" in el) ||
          (el as { type?: string }).type === "cssGradient"
        ) {
          return null;
        }
        const candidate = el as ElementBlock & { id?: unknown };
        const baseId =
          typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : key;
        const nextCount = (idCounts.get(baseId) ?? 0) + 1;
        idCounts.set(baseId, nextCount);
        const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
        const prefix = id ?? "imageCompare";
        return { ...candidate, id: `${prefix}-handle-${uniqueId}` } as ElementBlock;
      })
      .filter((b): b is ElementBlock => b != null);
  }, [handleElements, id]);

  const computePosition = useCallback(
    (clientX: number, clientY: number): number | null => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return null;
      if (direction === "horizontal") {
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      }
      return Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    },
    [direction]
  );

  const endPointerGesture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    dragging.current = false;
    activePointerId.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current != null) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const next = computePosition(e.clientX, e.clientY);
      if (next == null) return;
      dragging.current = true;
      activePointerId.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      setPosition(next);
    },
    [computePosition]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current || e.pointerId !== activePointerId.current) return;
      const next = computePosition(e.clientX, e.clientY);
      if (next == null) return;
      setPosition(next);
    },
    [computePosition]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      endPointerGesture(e);
    },
    [endPointerGesture]
  );

  const onLostPointerCapture = useCallback(() => {
    dragging.current = false;
    activePointerId.current = null;
  }, []);

  const isH = direction === "horizontal";

  const handlePos = isH
    ? {
        left: `${position * 100}%`,
        top: "50%",
        transform: "translate(-50%, -50%)",
      }
    : {
        left: "50%",
        top: `${position * 100}%`,
        transform: "translate(-50%, -50%)",
      };

  const layout = {
    width: width as string | undefined,
    height: height as string | undefined,
    align: align as "left" | "center" | "right" | undefined,
    marginTop: marginTop as string | undefined,
    marginBottom: marginBottom as string | undefined,
    marginLeft: marginLeft as string | undefined,
    marginRight: marginRight as string | undefined,
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
  };

  const labelChip = "shrink-0 rounded bg-black/60 px-2 py-0.5 text-xs text-white shadow-sm";
  const labelRowTop =
    "pointer-events-none absolute inset-x-2 top-2 z-[var(--pb-z-modal)] flex flex-row items-start justify-between gap-2";
  const labelRowBottom =
    "pointer-events-none absolute inset-x-2 bottom-2 z-[var(--pb-z-modal)] flex flex-row items-end justify-between gap-2";
  const labelRowOverlay =
    "pointer-events-none absolute inset-x-4 top-1/2 z-[var(--pb-z-modal)] flex -translate-y-1/2 flex-row items-center justify-between gap-2";

  const compareLabel = ariaLabel ?? `${before.alt ?? "Before"} vs ${after.alt ?? "After"}`;
  const pctBefore = Math.round(position * 100);
  const stepPct = (keyboardStep ?? 1) / 100;

  const trackTouchClass = isH ? "touch-pan-y" : "touch-pan-x";
  const trackCursor = isH ? "cursor-ew-resize" : "cursor-ns-resize";
  const hasTrackSize = trackPx.w > 0 && trackPx.h > 0;

  return (
    <ElementLayoutWrapper layout={layout} interactions={interactions}>
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${trackTouchClass} ${trackCursor}`}
        style={{ aspectRatio: (aspectRatio as string) ?? "16/9" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onLostPointerCapture}
        role="slider"
        aria-label={compareLabel}
        aria-orientation={isH ? "horizontal" : "vertical"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pctBefore}
        aria-valuetext={`${pctBefore}% of the before image visible along the ${isH ? "horizontal" : "vertical"} axis`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Home") {
            e.preventDefault();
            setPosition(0);
            return;
          }
          if (e.key === "End") {
            e.preventDefault();
            setPosition(1);
            return;
          }
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            setPosition((p) => Math.min(1, p + stepPct));
          }
          if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            setPosition((p) => Math.max(0, p - stepPct));
          }
        }}
      >
        {labelPosition === "top" && (beforeLabel || afterLabel) ? (
          <div className={labelRowTop}>
            {beforeLabel ? (
              <span className={labelChip}>{beforeLabel}</span>
            ) : (
              <span className="min-w-0 shrink" aria-hidden />
            )}
            {afterLabel ? (
              <span className={labelChip}>{afterLabel}</span>
            ) : (
              <span className="min-w-0 shrink" aria-hidden />
            )}
          </div>
        ) : null}
        {labelPosition === "bottom" && (beforeLabel || afterLabel) ? (
          <div className={labelRowBottom}>
            {beforeLabel ? (
              <span className={labelChip}>{beforeLabel}</span>
            ) : (
              <span className="min-w-0 shrink" aria-hidden />
            )}
            {afterLabel ? (
              <span className={labelChip}>{afterLabel}</span>
            ) : (
              <span className="min-w-0 shrink" aria-hidden />
            )}
          </div>
        ) : null}
        {labelPosition === "overlay" && (beforeLabel || afterLabel) ? (
          <div className={labelRowOverlay}>
            {beforeLabel ? (
              <span className={labelChip}>{beforeLabel}</span>
            ) : (
              <span className="min-w-0 shrink" aria-hidden />
            )}
            {afterLabel ? (
              <span className={labelChip}>{afterLabel}</span>
            ) : (
              <span className="min-w-0 shrink" aria-hidden />
            )}
          </div>
        ) : null}
        {/* After: full frame. Before: inner width/height = full track in px (ResizeObserver) so object-cover matches the after layer; outer clip uses % so only the reveal edge moves. */}
        <div className="pointer-events-none absolute inset-0 z-[var(--pb-z-base)]">
          <Image
            src={after.src}
            alt={after.alt ?? ""}
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, min(900px, 90vw)"
            draggable={false}
          />
        </div>
        {isH ? (
          <div
            className="pointer-events-none absolute bottom-0 left-0 top-0 z-[var(--pb-z-raised)] overflow-hidden"
            style={{ width: `${position * 100}%` }}
          >
            {hasTrackSize ? (
              <div
                className="absolute left-0 top-0"
                style={{ width: trackPx.w, height: trackPx.h }}
              >
                <Image
                  src={before.src}
                  alt={before.alt ?? ""}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, min(900px, 90vw)"
                  draggable={false}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 top-0 z-[var(--pb-z-raised)] overflow-hidden"
            style={{ height: `${position * 100}%` }}
          >
            {hasTrackSize ? (
              <div
                className="absolute left-0 top-0"
                style={{ width: trackPx.w, height: trackPx.h }}
              >
                <Image
                  src={before.src}
                  alt={before.alt ?? ""}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, min(900px, 90vw)"
                  draggable={false}
                />
              </div>
            ) : null}
          </div>
        )}
        {handleBlocks.length > 0 ? (
          <>
            {dividerFill ? (
              <div
                className="pointer-events-none absolute z-[calc(var(--pb-z-overlay)+5)]"
                style={{
                  ...handlePos,
                  ...(isH
                    ? { width: dividerWidth, height: "100%" }
                    : { height: dividerWidth, width: "100%" }),
                  backgroundColor: dividerFill,
                }}
              />
            ) : null}
            <div
              className={`absolute z-[var(--pb-z-overlay)] flex min-h-11 min-w-11 flex-row items-center justify-center gap-1 ${trackCursor}`}
              style={handlePos}
            >
              {handleBlocks.map((block, index) => (
                <ElementRenderer key={generateElementKey(block, index)} block={block} />
              ))}
            </div>
          </>
        ) : (
          <>
            {dividerFill ? (
              <div
                className="pointer-events-none absolute z-[calc(var(--pb-z-overlay)+5)]"
                style={{
                  ...handlePos,
                  ...(isH
                    ? { width: dividerWidth, height: "100%" }
                    : { height: dividerWidth, width: "100%" }),
                  backgroundColor: dividerFill,
                }}
              />
            ) : null}
            <div
              className={`absolute z-[var(--pb-z-overlay)] flex min-h-11 min-w-11 items-center justify-center ${trackCursor}`}
              style={handlePos}
            >
              <div
                className="flex items-center justify-center rounded-full shadow-lg"
                style={{
                  width: handleSize,
                  height: handleSize,
                  backgroundColor: handleFill,
                }}
              >
                {handleIcon === "arrow" && (
                  <span className="text-xs select-none" aria-hidden>
                    ⟷
                  </span>
                )}
                {handleIcon === "chevron" && (
                  <span className="text-xs select-none" aria-hidden>
                    {isH ? "◀▶" : "▲▼"}
                  </span>
                )}
                {handleIcon === "grip" && (
                  <div className="flex gap-px select-none" aria-hidden>
                    {isH ? "┊┊┊" : "≡"}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ElementLayoutWrapper>
  );
}
