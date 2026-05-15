"use client";

import { useCallback } from "react";
import { useDragControls } from "./gestures";
import type { DragControls } from "./types";

export type DragHandleBindings = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
};

export type UseDragHandleControlsResult = {
  dragControls: DragControls;
  handleBindings: DragHandleBindings;
};

/**
 * Small helper around useDragControls for cases where the drag handle
 * lives on a different element than the draggable content (e.g. sliders).
 * Keeps Framer Motion imports behind the integration layer.
 */
export function useDragHandleControls(): UseDragHandleControlsResult {
  const dragControls = useDragControls();

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      // Framer Motion will read the underlying native event from the synthetic event.
      dragControls.start(event as unknown as PointerEvent);
    },
    [dragControls]
  );

  return {
    dragControls,
    handleBindings: { onPointerDown },
  };
}
