/**
 * Detection heuristic for column-layout frames.
 */

import { extractColumnGrid } from "./layout-grid";
import { getVisibleChildren, isContainerNode } from "./structure-hints";

/**
 * Returns true when the given frame should be treated as a column-layout section.
 *
 * A frame qualifies when ANY of:
 * - It carries a `[pb: type=sectionColumn]` annotation, OR
 * - It has a Figma layout grid with ≥ 2 columns, OR
 * - Its `layoutMode` is `"HORIZONTAL"` AND ALL direct children are frame-type nodes
 *   AND there are ≥ 2 of them, OR
 * - Its `layoutMode` is `"HORIZONTAL"` AND frame-type children collectively account for
 *   > 60% of the frame's total width.
 */
export function isColumnLayout(frame: FrameNode, annotations: Record<string, string>): boolean {
  // 1. Explicit annotation always wins
  if (annotations["type"]?.toLowerCase() === "sectioncolumn") return true;

  // 2. Layout grid = designer explicitly declared columns
  if ("width" in frame) {
    const grid = extractColumnGrid(frame, (frame as { width: number }).width);
    if (grid && grid.count >= 2) return true;
  }

  // 3. Auto-layout heuristics
  if (frame.layoutMode !== "HORIZONTAL") return false;

  const visibleChildren = getVisibleChildren(frame.children as readonly SceneNode[]);
  const structuralChildren = visibleChildren.filter(isContainerNode);

  if (visibleChildren.length < 2) return false;
  if (structuralChildren.length >= 2 && structuralChildren.length === visibleChildren.length)
    return true;

  const totalStructuralWidth = structuralChildren.reduce(
    (sum, c) => sum + ("width" in c ? c.width : 0),
    0
  );
  const totalVisibleWidth = visibleChildren.reduce(
    (sum, c) => sum + ("width" in c ? (c as { width: number }).width : 0),
    0
  );

  if (frame.width > 0 && totalVisibleWidth / frame.width > 0.6) return true;
  return structuralChildren.length >= 2 && totalStructuralWidth > 0;
}
