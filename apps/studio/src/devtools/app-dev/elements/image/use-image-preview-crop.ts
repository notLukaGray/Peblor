import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImageElementDevController } from "@/app/dev/elements/image/useImageElementDevController";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveCropCursor({
  canCropPanZoom,
  cropDragMode,
  objectPositionCropActive,
  isDraggingCrop,
  runtimeCursor,
}: {
  canCropPanZoom: boolean;
  cropDragMode: "pan" | "scale" | null;
  objectPositionCropActive: boolean;
  isDraggingCrop: boolean;
  runtimeCursor: string | undefined;
}) {
  if (canCropPanZoom) {
    if (cropDragMode === "pan") return "grabbing";
    if (cropDragMode === "scale") return "ew-resize";
    return "grab";
  }
  if (!objectPositionCropActive) return runtimeCursor;
  return isDraggingCrop ? "grabbing" : "grab";
}

function resolvePointerDragMode(button: number): "pan" | "scale" | null {
  if (button === 0) return "pan";
  if (button === 2) return "scale";
  return null;
}

function buildPanCrop(
  current: { x?: number; y?: number; scale?: number },
  deltaX: number,
  deltaY: number,
  width: number,
  height: number
) {
  return {
    ...current,
    x: clamp((current.x ?? 0) + (deltaX / width) * 100, -45, 45),
    y: clamp((current.y ?? 0) + (deltaY / height) * 100, -45, 45),
    scale: current.scale ?? 1,
  };
}

function buildScaleCrop(current: { x?: number; y?: number; scale?: number }, deltaScale: number) {
  return {
    ...current,
    x: current.x ?? 0,
    y: current.y ?? 0,
    scale: clamp((current.scale ?? 1) + deltaScale, 1, 4),
  };
}

export function useImagePreviewCrop({
  controller,
  canCrop,
  canCropPanZoom,
  runtimeCursor,
}: {
  controller: ImageElementDevController;
  canCrop: boolean;
  canCropPanZoom: boolean;
  runtimeCursor: string | undefined;
}) {
  const controllerRef = useRef(controller);
  const cropSurfaceRef = useRef<HTMLDivElement | null>(null);
  const lastPtrRef = useRef<{ x: number; y: number } | null>(null);

  const [cropMode, setCropMode] = useState(false);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropDragMode, setCropDragMode] = useState<"pan" | "scale" | null>(null);

  useEffect(() => {
    controllerRef.current = controller;
  }, [controller]);

  const objectPositionCropActive = cropMode && canCrop;
  const cropInteractionActive = objectPositionCropActive || canCropPanZoom;

  const cropCursorResolved = useMemo(
    () =>
      resolveCropCursor({
        canCropPanZoom,
        cropDragMode,
        objectPositionCropActive,
        isDraggingCrop,
        runtimeCursor,
      }),
    [canCropPanZoom, cropDragMode, isDraggingCrop, objectPositionCropActive, runtimeCursor]
  );

  const setFocalFromClient = useCallback((clientX: number, clientY: number) => {
    if (!cropSurfaceRef.current) return;
    const rect = cropSurfaceRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const normalizedX = (clientX - rect.left) / rect.width;
    const normalizedY = (clientY - rect.top) / rect.height;
    const state = controllerRef.current;
    const current = state.active.imageCrop ?? { x: 0, y: 0, scale: 1 };
    state.setVariantPatch(state.activeVariant, {
      imageCrop: {
        ...current,
        focalX: clamp(normalizedX, 0, 1),
        focalY: clamp(normalizedY, 0, 1),
      },
    });
  }, []);

  const updateCropPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!canCrop || !cropSurfaceRef.current) return;
      const rect = cropSurfaceRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
      controllerRef.current.setVariantPatch(controllerRef.current.activeVariant, {
        objectPosition: `${x.toFixed(1)}% ${y.toFixed(1)}%`,
      });
    },
    [canCrop]
  );

  useEffect(() => {
    if (!cropDragMode) return;
    const onMove = (event: PointerEvent) => {
      if (!lastPtrRef.current || !cropSurfaceRef.current) return;
      const rect = cropSurfaceRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const state = controllerRef.current;
      const current = state.active.imageCrop ?? { x: 0, y: 0, scale: 1 };
      const deltaX = event.clientX - lastPtrRef.current.x;
      const deltaY = event.clientY - lastPtrRef.current.y;
      lastPtrRef.current = { x: event.clientX, y: event.clientY };
      const nextCrop =
        cropDragMode === "pan"
          ? buildPanCrop(current, deltaX, deltaY, rect.width, rect.height)
          : buildScaleCrop(current, (deltaX / rect.width) * 3);
      state.setVariantPatch(state.activeVariant, {
        imageCrop: nextCrop,
      });
    };
    const onUp = () => {
      setCropDragMode(null);
      lastPtrRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [cropDragMode]);

  const handleSurfacePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (canCropPanZoom) {
        const dragMode = resolvePointerDragMode(event.button);
        if (dragMode) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          lastPtrRef.current = { x: event.clientX, y: event.clientY };
          setCropDragMode(dragMode);
          return;
        }
        if (event.button === 1) {
          event.preventDefault();
          setFocalFromClient(event.clientX, event.clientY);
        }
        return;
      }
      if (!objectPositionCropActive) return;
      setIsDraggingCrop(true);
      updateCropPosition(event.clientX, event.clientY);
    },
    [canCropPanZoom, objectPositionCropActive, setFocalFromClient, updateCropPosition]
  );

  const handleSurfaceContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (canCropPanZoom) event.preventDefault();
    },
    [canCropPanZoom]
  );

  const handleSurfaceMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!objectPositionCropActive || !isDraggingCrop) return;
      updateCropPosition(event.clientX, event.clientY);
    },
    [isDraggingCrop, objectPositionCropActive, updateCropPosition]
  );

  return {
    cropSurfaceRef,
    cropMode,
    cropCursorResolved,
    cropInteractionActive,
    objectPositionCropActive,
    setCropMode,
    handleSurfacePointerDown,
    handleSurfaceContextMenu,
    handleSurfaceMouseMove,
    handleSurfaceMouseUp: () => setIsDraggingCrop(false),
    handleSurfaceMouseLeave: () => setIsDraggingCrop(false),
  };
}
