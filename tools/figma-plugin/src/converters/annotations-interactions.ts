/**
 * Element-level interaction annotation parsing.
 * Converts [pb: onClick=..., onHoverEnter=..., cursor=...] annotations to ElementInteractions.
 */

import type { ElementInteractions, CursorType } from "../types/peblor";
import { parseTriggerShorthand } from "./annotations-trigger";

/** Interaction trigger keys recognised in annotations (excluding `cursor`). */
const INTERACTION_KEYS: ReadonlyArray<keyof Omit<ElementInteractions, "cursor">> = [
  "onClick",
  "onHoverEnter",
  "onHoverLeave",
  "onPointerDown",
  "onPointerUp",
  "onDoubleClick",
  "onDragEnd",
];

/** Valid CSS cursor values the annotation parser accepts. */
const CURSOR_VALUES = new Set<CursorType>([
  "pointer",
  "default",
  "grab",
  "grabbing",
  "crosshair",
  "zoom-in",
  "zoom-out",
  "text",
  "move",
  "not-allowed",
]);

/**
 * Parses element-level interaction annotations from a [pb: ...] annotation map
 * into an `ElementInteractions` object.
 *
 * Returns `undefined` if no recognised interaction annotations are present.
 */
export function parseElementInteractionAnnotations(
  annotations: Record<string, string>
): ElementInteractions | undefined {
  const result: ElementInteractions = {};

  for (const key of INTERACTION_KEYS) {
    const rawKey = key.toLowerCase();
    const value = annotations[rawKey];
    if (!value) continue;

    const action = parseTriggerShorthand(value);
    if (!action) continue;

    (result as Record<string, unknown>)[key] = action;
  }

  const cursorValue = annotations["cursor"];
  if (cursorValue && CURSOR_VALUES.has(cursorValue as CursorType)) {
    result.cursor = cursorValue as CursorType;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
