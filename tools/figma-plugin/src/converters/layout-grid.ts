/**
 * Figma layout grid (column grid) detection and child-snapping utilities.
 */

/** Describes the column grid of a Figma frame. */
export interface ColumnGridInfo {
  /** Number of columns in the grid. */
  count: number;
  /** Width of each column in pixels. */
  columnWidthPx: number;
  /** Gutter between columns in pixels. */
  gutterPx: number;
  /** Left (and right for CENTER) margin in pixels. */
  offsetPx: number;
  /** Precomputed left edge of each column (0-indexed), in px from frame left. */
  columnEdges: number[];
}

/**
 * Extracts the first visible COLUMNS layout grid from a frame node.
 * Returns undefined if no column grid is present.
 */
export function extractColumnGrid(node: SceneNode, frameWidth: number): ColumnGridInfo | undefined {
  const layoutGrids = (node as unknown as { layoutGrids?: readonly LayoutGrid[] }).layoutGrids;
  if (!layoutGrids || layoutGrids.length === 0) return undefined;

  const colGrid = layoutGrids.find(
    (g) => g.visible !== false && (g as unknown as { pattern: string }).pattern === "COLUMNS"
  ) as unknown as
    | {
        pattern: string;
        sectionSize: number;
        gutterSize: number;
        offset: number;
        count: number;
        alignment: string;
      }
    | undefined;

  if (!colGrid) return undefined;

  const { count, gutterSize, offset, alignment } = colGrid;
  if (count < 2) return undefined;

  let columnWidthPx: number;
  if (alignment === "STRETCH" || colGrid.sectionSize <= 0) {
    columnWidthPx = (frameWidth - 2 * offset - (count - 1) * gutterSize) / count;
  } else {
    columnWidthPx = colGrid.sectionSize;
  }

  if (columnWidthPx <= 0) return undefined;

  const columnEdges: number[] = [];
  for (let i = 0; i < count; i++) {
    columnEdges.push(Math.round(offset + i * (columnWidthPx + gutterSize)));
  }

  return {
    count,
    columnWidthPx: Math.round(columnWidthPx),
    gutterPx: gutterSize,
    offsetPx: offset,
    columnEdges,
  };
}

/**
 * Given a child element's x position and width, returns the 1-based column index
 * (and span) it most closely aligns to in the given grid.
 */
export function snapToColumn(
  childX: number,
  childWidth: number,
  grid: ColumnGridInfo
): { column: number; span: number } {
  const tolerance = Math.max(grid.gutterPx / 2, 8);

  let startCol = 1;
  let minDist = Infinity;
  for (let i = 0; i < grid.columnEdges.length; i++) {
    const dist = Math.abs(childX - grid.columnEdges[i]);
    if (dist < minDist) {
      minDist = dist;
      startCol = i + 1;
    }
  }

  const childRight = childX + childWidth;
  let span = 1;
  for (let i = startCol; i < grid.columnEdges.length; i++) {
    const nextColRight = grid.columnEdges[i] + grid.columnWidthPx;
    if (childRight > nextColRight - tolerance) {
      span = i - startCol + 2;
    }
  }
  span = Math.max(1, Math.min(span, grid.count - startCol + 1));

  return { column: startCol, span };
}
