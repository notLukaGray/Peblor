"use client";

/**
 * Rive integration for the Peblor.
 * All @rive-app/react-canvas imports go through this folder;
 * no direct "@rive-app/react-canvas" imports anywhere else in peblor.
 *
 * Data flow: elementRive JSON → elementRiveSchema → ElementRive → RivePlayer
 * → @rive-app/react-canvas internals.
 * Trigger actions with prefix "rive.*" are dispatched via the peblor
 * action bus and handled by useRiveTriggerControls in the element.
 */

export { RivePlayer } from "./RivePlayer";
export type { RivePlayerProps } from "./RivePlayer";

// Re-export Rive type so the element can type its ref without a direct import.
export type { Rive } from "@rive-app/react-canvas";
