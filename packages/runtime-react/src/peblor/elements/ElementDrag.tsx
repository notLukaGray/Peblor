"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { reconcileElementOrderWithDefinitions } from "@pb/core/modules";
import { generateElementKey } from "@pb/core/keys";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { ElementRenderer } from "./Shared/ElementRenderer";

type Props = Extract<ElementBlock, { type: "elementDrag" }>;

function clamp(val: number, min: number, max: number): number {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

function snapValue(val: number, grid: number): number {
  if (!grid) return val;
  return Math.round(val / grid) * grid;
}

type DragBounds = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

function clampDragPosition(
  nx: number,
  ny: number,
  snap: { x?: number; y?: number } | undefined,
  bounds: DragBounds | undefined,
  constrainToParent: boolean | undefined,
  container: HTMLDivElement | null
): { x: number; y: number } {
  let x = nx;
  let y = ny;
  if (snap?.x) x = snapValue(x, snap.x);
  if (snap?.y) y = snapValue(y, snap.y);
  if (bounds) {
    if (bounds.left !== undefined) x = Math.max(x, bounds.left);
    if (bounds.right !== undefined) x = Math.min(x, bounds.right);
    if (bounds.top !== undefined) y = Math.max(y, bounds.top);
    if (bounds.bottom !== undefined) y = Math.min(y, bounds.bottom);
  }
  if (constrainToParent && container) {
    const rect = container.getBoundingClientRect();
    x = clamp(x, -rect.width, rect.width);
    y = clamp(y, -rect.height, rect.height);
  }
  return { x, y };
}

export function ElementDrag({
  id,
  axis = "both",
  snap,
  bounds,
  constrainToParent,
  dragThreshold = 3,
  dragOpacity,
  snapBack,
  snapBackDuration,
  ariaLabel,
  children,
  dragHandleWidth,
  dragHandleHeight,
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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const childBlocks = useMemo((): ElementBlock[] => {
    if (!children?.definitions) return [];
    const definitions = children.definitions as Record<string, unknown>;
    const order = reconcileElementOrderWithDefinitions(children.elementOrder, definitions);
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
        const prefix = id ?? "drag";
        return { ...candidate, id: `${prefix}-${uniqueId}` } as ElementBlock;
      })
      .filter((b): b is ElementBlock => b != null);
  }, [children, id]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) return;
      setIsDragging(true);
      startPos.current = { x: e.clientX, y: e.clientY };
      offset.current = { ...position };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [position, isDragging]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.abs(dx) + Math.abs(dy) < dragThreshold) return;

      const nx = offset.current.x + (axis !== "y" ? dx : 0);
      const ny = offset.current.y + (axis !== "x" ? dy : 0);
      setPosition(clampDragPosition(nx, ny, snap, bounds, constrainToParent, containerRef.current));
    },
    [axis, snap, bounds, constrainToParent, dragThreshold, isDragging]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* not captured */
      }
      if (snapBack && offset.current.x === 0 && offset.current.y === 0) {
        setPosition({ x: 0, y: 0 });
      }
    },
    [snapBack]
  );

  const onLostPointerCapture = useCallback(() => {
    setIsDragging(false);
  }, []);

  const keyboardStep = useMemo(() => {
    const sx = snap?.x && snap.x > 0 ? snap.x : undefined;
    const sy = snap?.y && snap.y > 0 ? snap.y : undefined;
    if (sx != null && sy != null) return Math.min(sx, sy);
    return sx ?? sy ?? 10;
  }, [snap]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Home") {
        e.preventDefault();
        setPosition((prev) => {
          const nx = axis === "y" ? prev.x : 0;
          const ny = axis === "x" ? prev.y : 0;
          return clampDragPosition(nx, ny, snap, bounds, constrainToParent, containerRef.current);
        });
        return;
      }
      const deltas: Record<string, { dx: number; dy: number }> = {
        ArrowLeft: { dx: -keyboardStep, dy: 0 },
        ArrowRight: { dx: keyboardStep, dy: 0 },
        ArrowUp: { dx: 0, dy: -keyboardStep },
        ArrowDown: { dx: 0, dy: keyboardStep },
      };
      const delta = deltas[e.key];
      if (!delta) return;
      if ((delta.dx !== 0 && axis === "y") || (delta.dy !== 0 && axis === "x")) return;
      e.preventDefault();
      setPosition((prev) =>
        clampDragPosition(
          prev.x + delta.dx,
          prev.y + delta.dy,
          snap,
          bounds,
          constrainToParent,
          containerRef.current
        )
      );
    },
    [axis, bounds, constrainToParent, keyboardStep, snap]
  );

  const dragSurfaceLabel = useMemo(() => {
    const base = ariaLabel?.trim() ? ariaLabel.trim() : "Draggable content";
    return `${base}. Use arrow keys to move, or drag with a mouse or touch.`;
  }, [ariaLabel]);

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

  const handleStyle = {
    width: (dragHandleWidth as string) ?? "100%",
    height: (dragHandleHeight as string) ?? "100%",
  };

  return (
    <ElementLayoutWrapper layout={layout} interactions={interactions}>
      <div ref={containerRef} className="relative w-full h-full select-none" data-element-id={id}>
        <div
          role="group"
          aria-label={dragSurfaceLabel}
          tabIndex={0}
          className="absolute cursor-grab active:cursor-grabbing touch-none outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:rounded-sm focus-visible:outline-[rgba(255,255,255,0.5)]"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            transition:
              snapBack && !isDragging
                ? `transform ${(snapBackDuration ?? 300) / 1000}s ease-out`
                : undefined,
            opacity: dragOpacity,
            ...handleStyle,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onLostPointerCapture={onLostPointerCapture}
          onKeyDown={onKeyDown}
        >
          {childBlocks.map((block, index) => (
            <ElementRenderer key={generateElementKey(block, index)} block={block} />
          ))}
        </div>
      </div>
    </ElementLayoutWrapper>
  );
}
