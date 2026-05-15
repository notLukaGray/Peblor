"use client";

import { createContext, useContext } from "react";

/**
 * Set to true by ElementRenderer when the block it is rendering has a gesture
 * animation that changes width or height (whileHover/whileTap with width/height keys).
 *
 * Consumed by ElementModuleGroup to override fixed px widths/heights with "100%"
 * so that nested visual layers (inner frames) grow with their animated container
 * rather than staying at their Figma-exported fixed size.
 *
 * Design convention: the correct Figma approach is to set inner frames to
 * "Fill container" sizing — the plugin then emits no fixed width and this context
 * is not needed. This context is a renderer-side safety net for cases where the
 * Figma file uses fixed sizing on inner frames.
 *
 * Limitation: applies to ALL nested elementGroups, which is correct for
 * single-child-chain structures (container → visual frame → content) but may
 * be too broad for multi-child rows where some children have intentional fixed sizes.
 * Use "Fill container" sizing in Figma to get precise control.
 */
export const DimensionGestureContext = createContext<boolean>(false);

export function useDimensionGestureContext(): boolean {
  return useContext(DimensionGestureContext);
}
