import type { SectionBorder } from "./peblor-schemas";
import type { ThemeStringOrGradient } from "./peblor-schemas/schema-shared-primitives";

/**
 * Responsive wrapper for section-column inputs. Accepts:
 *   - scalar T
 *   - tier map `{ base?, sm?, md?, lg?, xl?, "2xl"? }`
 */
export type SectionColumnResponsive<T> =
  | T
  | { base?: T; sm?: T; md?: T; lg?: T; xl?: T; "2xl"?: T };

export type SectionColumnStyle = {
  borderRadius?: string;
  border?: SectionBorder;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  fill?: ThemeStringOrGradient;
  padding?: string;
  gap?: string;
  distribute?: "start" | "center" | "end" | "between" | "around" | "evenly";
  align?: "start" | "center" | "end" | "stretch";
  alignX?: "left" | "center" | "right" | "stretch";
  alignY?: "top" | "center" | "bottom" | "space-between" | "space-around" | "space-evenly";
  minHeight?: string;
  maxHeight?: string;
  minWidth?: string;
  maxWidth?: string;
  width?: string;
  height?: string;
  scroll?: "visible" | "hidden" | "auto" | "scroll";
  scrollX?: "visible" | "hidden" | "auto" | "scroll";
  scrollY?: "visible" | "hidden" | "auto" | "scroll";
};

export type ResponsiveSectionColumnStyleList = {
  base?: SectionColumnStyle[];
  sm?: SectionColumnStyle[];
  md?: SectionColumnStyle[];
  lg?: SectionColumnStyle[];
  xl?: SectionColumnStyle[];
  "2xl"?: SectionColumnStyle[];
};

export type SectionColumnWidths =
  | "equal"
  | "hug"
  | Array<number | string>
  | {
      base?: "equal" | "hug" | Array<number | string>;
      sm?: "equal" | "hug" | Array<number | string>;
      md?: "equal" | "hug" | Array<number | string>;
      lg?: "equal" | "hug" | Array<number | string>;
      xl?: "equal" | "hug" | Array<number | string>;
      "2xl"?: "equal" | "hug" | Array<number | string>;
    };

export type SectionColumnAssignments =
  | Record<string, number>
  | {
      base?: Record<string, number>;
      sm?: Record<string, number>;
      md?: Record<string, number>;
      lg?: Record<string, number>;
      xl?: Record<string, number>;
      "2xl"?: Record<string, number>;
    };

export type SectionColumnGaps =
  | string
  | string[]
  | {
      base?: string | string[];
      sm?: string | string[];
      md?: string | string[];
      lg?: string | string[];
      xl?: string | string[];
      "2xl"?: string | string[];
    };

export type SectionColumnStyles = SectionColumnStyle[] | ResponsiveSectionColumnStyleList;

export type SectionColumnSpanMap = Record<string, number | "all">;

export type ResponsiveSectionColumnSpanMap = {
  base?: SectionColumnSpanMap;
  sm?: SectionColumnSpanMap;
  md?: SectionColumnSpanMap;
  lg?: SectionColumnSpanMap;
  xl?: SectionColumnSpanMap;
  "2xl"?: SectionColumnSpanMap;
};

export type SectionColumnItemStyles =
  | Record<string, SectionColumnStyle>
  | {
      base?: Record<string, Record<string, unknown>>;
      sm?: Record<string, Record<string, unknown>>;
      md?: Record<string, Record<string, unknown>>;
      lg?: Record<string, Record<string, unknown>>;
      xl?: Record<string, Record<string, unknown>>;
      "2xl"?: Record<string, Record<string, unknown>>;
    };

export type SectionColumnItemLayoutEntry = {
  column?: number;
  row?: number;
  columnSpan?: number | "all";
  rowSpan?: number;
  order?: number;
  alignX?: "left" | "center" | "right" | "stretch";
  alignY?: "top" | "center" | "bottom" | "stretch";
  layer?: number;
  /** CSS grid-area — assign this item to a named template area or row/col shorthand. */
  gridArea?: string;
  /** CSS grid-column placement shorthand (e.g. "1 / 3", "span 2"). */
  gridColumn?: string;
  /** CSS grid-row placement shorthand (e.g. "1 / 3", "span 2"). */
  gridRow?: string;
};

export type SectionColumnItemLayout =
  | Record<string, SectionColumnItemLayoutEntry>
  | {
      base?: Record<string, Record<string, unknown>>;
      sm?: Record<string, Record<string, unknown>>;
      md?: Record<string, Record<string, unknown>>;
      lg?: Record<string, Record<string, unknown>>;
      xl?: Record<string, Record<string, unknown>>;
      "2xl"?: Record<string, Record<string, unknown>>;
    };

// Core-facing aliases used by layout resolution internals.
export const DEFAULT_COLUMN_WIDTHS = "hug" as const;

export type ColumnCountInput = number | SectionColumnResponsive<number>;
export type ElementOrderInput = string[] | SectionColumnResponsive<string[]> | undefined;
export type ColumnAssignmentsInput = SectionColumnAssignments;
export type ColumnGapsInput = SectionColumnGaps | undefined;
export type ColumnWidthsValueInput =
  | typeof DEFAULT_COLUMN_WIDTHS
  | "equal"
  | (number | "hug" | "equal" | string)[];
export type ColumnWidthsInput = SectionColumnResponsive<ColumnWidthsValueInput>;
export type ResolvedColumnWidthsInput = ColumnWidthsValueInput | undefined;

export type ColumnStyleInput = SectionColumnStyle;
export type ColumnStylesInput = SectionColumnStyles | undefined;
export type ColumnSpanValueInput = SectionColumnSpanMap;
export type ColumnSpanInput = SectionColumnSpanMap | ResponsiveSectionColumnSpanMap | undefined;
export type ResolvedColumnSpanInput = ColumnSpanValueInput | undefined;

export type ItemStyleInput = SectionColumnStyle;
export type ItemStylesValueInput = Record<string, ItemStyleInput>;
export type ItemStylesInput = SectionColumnResponsive<ItemStylesValueInput> | undefined;
export type ResolvedItemStylesInput = ItemStylesValueInput | undefined;

export type GridModeValue = "columns" | "grid";
export type GridModeInput = SectionColumnResponsive<GridModeValue> | undefined;

export type ItemLayoutEntryInput = SectionColumnItemLayoutEntry;
export type ItemLayoutValueInput = Record<string, ItemLayoutEntryInput>;
export type ItemLayoutInput = SectionColumnResponsive<ItemLayoutValueInput> | undefined;
export type ResolvedItemLayoutInput = ItemLayoutValueInput | undefined;

export type ElementWithId = { id?: string; [key: string]: unknown };
