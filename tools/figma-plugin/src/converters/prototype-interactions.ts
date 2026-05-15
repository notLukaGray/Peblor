/**
 * Converts Figma prototype reactions on a node into peblor `interactions` objects.
 */

import type { ElementInteractions, TriggerAction, CursorType } from "../types/peblor";
import { convertFigmaAction } from "./prototype-action-convert";

// Re-export so callers can import the shared types from one place.
export type { ElementInteractions, TriggerAction };

// ---------------------------------------------------------------------------
// Figma trigger type → peblor interactions key
// ---------------------------------------------------------------------------

type InteractionKey = keyof Omit<ElementInteractions, "cursor">;

const TRIGGER_MAP: Record<string, InteractionKey> = {
  ON_CLICK: "onClick",
  MOUSE_ENTER: "onHoverEnter",
  MOUSE_LEAVE: "onHoverLeave",
  MOUSE_DOWN: "onPointerDown",
  MOUSE_UP: "onPointerUp",
  ON_HOVER: "onHoverEnter",
  ON_PRESS: "onPointerDown",
  ON_DRAG: "onDragEnd",
  ON_DOUBLE_CLICK: "onDoubleClick",
  DOUBLE_CLICK: "onDoubleClick",
};

// ---------------------------------------------------------------------------
// Cursor inference
// ---------------------------------------------------------------------------

function inferCursor(interactions: ElementInteractions): CursorType | undefined {
  if (interactions.onDragEnd) return "grab";
  if (interactions.onClick || interactions.onHoverEnter) return "pointer";
  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extracts prototype interactions from a Figma node's `reactions` array and
 * converts them to a peblor `ElementInteractions` object.
 *
 * Returns `undefined` if the node has no `reactions`, or none could be converted.
 */
export function extractPrototypeInteractions(
  node: SceneNode,
  warnings?: string[]
): ElementInteractions | undefined {
  if (!("reactions" in node)) return undefined;

  const reactions = (node as SceneNode & { reactions?: readonly Reaction[] }).reactions;
  if (!Array.isArray(reactions) || reactions.length === 0) return undefined;

  const result: ElementInteractions = {};
  const exportNotes: string[] = [];

  for (const reaction of reactions) {
    if (!reaction.trigger || !reaction.action) continue;

    const key = TRIGGER_MAP[reaction.trigger.type];
    if (!key) continue;

    if (result[key] !== undefined) continue;

    const action = convertFigmaAction(reaction.action, exportNotes);
    if (!action) continue;

    (result as Record<string, TriggerAction>)[key] = action;
  }

  if (Object.keys(result).length === 0) return undefined;

  const cursor = inferCursor(result);
  if (cursor) result.cursor = cursor;

  if (warnings && exportNotes.length > 0) {
    for (const note of exportNotes) {
      warnings.push(note);
    }
  }

  return result;
}
