/**
 * Barrel — re-exports all layout extraction utilities.
 * No logic lives here.
 */

export type { BorderProps } from "./layout-border";
export { extractBorderProps } from "./layout-border";

export { extractLayoutProps, extractChildAutoLayoutOverrides } from "./layout-frame-props";

export {
  extractAutoLayoutProps,
  extractAbsolutePositionStyle,
  isAbsolutePositioned,
  extractConstraintPosition,
  extractSectionPlacementFromParent,
  type FigmaConstraintsPayload,
} from "./layout-auto-props";

export type { ColumnGridInfo } from "./layout-grid";
export { extractColumnGrid, snapToColumn } from "./layout-grid";

export { resolveNumericVar } from "./layout-var-resolve";
export type { BoundVarsMap } from "./layout-var-resolve";
