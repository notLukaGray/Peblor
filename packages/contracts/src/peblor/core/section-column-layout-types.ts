import type { SectionBorder, ThemeString } from "./peblor-schemas";

export type SectionColumnStyle = {
  borderRadius?: string;
  border?: SectionBorder;
  fill?: ThemeString;
  padding?: string;
  gap?: string;
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  alignX?: "left" | "center" | "right" | "stretch";
  alignY?: "top" | "center" | "bottom" | "space-between" | "space-around" | "space-evenly";
  minHeight?: string;
  maxHeight?: string;
  minWidth?: string;
  maxWidth?: string;
  width?: string;
  height?: string;
  overflow?: "visible" | "hidden" | "auto" | "scroll";
  overflowX?: "visible" | "hidden" | "auto" | "scroll";
  overflowY?: "visible" | "hidden" | "auto" | "scroll";
};

export type ResponsiveSectionColumnStyleList = {
  mobile?: SectionColumnStyle[];
  desktop?: SectionColumnStyle[];
};

export type SectionColumnWidths =
  | "equal"
  | "hug"
  | Array<number | string>
  | {
      mobile?: "equal" | "hug" | Array<number | string>;
      desktop?: "equal" | "hug" | Array<number | string>;
    };

export type SectionColumnAssignments =
  | Record<string, number>
  | { mobile?: Record<string, number>; desktop?: Record<string, number> };

export type SectionColumnGaps =
  | string
  | string[]
  | { mobile?: string | string[]; desktop?: string | string[] };

export type SectionColumnStyles = SectionColumnStyle[] | ResponsiveSectionColumnStyleList;

export type SectionColumnSpanMap = Record<string, number | "all">;

export type ResponsiveSectionColumnSpanMap = {
  mobile?: SectionColumnSpanMap;
  desktop?: SectionColumnSpanMap;
};

export type SectionColumnItemStyles =
  | Record<string, SectionColumnStyle>
  | {
      mobile?: Record<string, Record<string, unknown>>;
      desktop?: Record<string, Record<string, unknown>>;
    };

export type SectionColumnItemLayoutEntry = {
  column?: number;
  row?: number;
  columnSpan?: number | "all";
  rowSpan?: number;
  order?: number;
  alignX?: "left" | "center" | "right" | "stretch";
  alignY?: "top" | "center" | "bottom" | "stretch";
  zIndex?: number;
};

export type SectionColumnItemLayout =
  | Record<string, SectionColumnItemLayoutEntry>
  | {
      mobile?: Record<string, Record<string, unknown>>;
      desktop?: Record<string, Record<string, unknown>>;
    };

// Core-facing aliases used by layout resolution internals.
export const DEFAULT_COLUMN_WIDTHS = "hug" as const;

export type ColumnCountInput = number | { mobile?: number; desktop?: number };
export type ElementOrderInput = string[] | { mobile?: string[]; desktop?: string[] } | undefined;
export type ColumnAssignmentsInput = SectionColumnAssignments;
export type ColumnGapsInput = SectionColumnGaps | undefined;
export type ColumnWidthsValueInput =
  | typeof DEFAULT_COLUMN_WIDTHS
  | "equal"
  | (number | "hug" | "equal" | string)[];
export type ColumnWidthsInput =
  | ColumnWidthsValueInput
  | { mobile?: ColumnWidthsValueInput; desktop?: ColumnWidthsValueInput };
export type ResolvedColumnWidthsInput = ColumnWidthsValueInput | undefined;

export type ColumnStyleInput = SectionColumnStyle;
export type ColumnStylesInput = SectionColumnStyles | undefined;
export type ColumnSpanValueInput = SectionColumnSpanMap;
export type ColumnSpanInput = SectionColumnSpanMap | ResponsiveSectionColumnSpanMap | undefined;
export type ResolvedColumnSpanInput = ColumnSpanValueInput | undefined;

export type ItemStyleInput = SectionColumnStyle;
export type ItemStylesValueInput = Record<string, ItemStyleInput>;
export type ItemStylesInput =
  | ItemStylesValueInput
  | { mobile?: ItemStylesValueInput; desktop?: ItemStylesValueInput }
  | undefined;
export type ResolvedItemStylesInput = ItemStylesValueInput | undefined;

export type GridModeValue = "columns" | "grid";
export type GridModeInput =
  | GridModeValue
  | { mobile?: GridModeValue; desktop?: GridModeValue }
  | undefined;

export type ItemLayoutEntryInput = SectionColumnItemLayoutEntry;
export type ItemLayoutValueInput = Record<string, ItemLayoutEntryInput>;
export type ItemLayoutInput =
  | ItemLayoutValueInput
  | { mobile?: ItemLayoutValueInput; desktop?: ItemLayoutValueInput }
  | undefined;
export type ResolvedItemLayoutInput = ItemLayoutValueInput | undefined;

export type ElementWithId = { id?: string; [key: string]: unknown };
