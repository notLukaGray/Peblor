/**
 * Section block types and content block layout props for the peblor schema.
 */

import type { ElementBlock } from "./peblor-element";
import type { ResponsiveString } from "./peblor-primitives";

export type SectionType =
  | "contentBlock"
  | "sectionColumn"
  | "divider"
  | "scrollContainer"
  | "sectionTrigger"
  | "formBlock"
  | "revealSection";

export interface BaseSectionProps {
  id?: string;
  fill?: ResponsiveString;
  width?: ResponsiveString;
  height?: ResponsiveString;
  minWidth?: ResponsiveString;
  maxWidth?: ResponsiveString;
  minHeight?: ResponsiveString;
  maxHeight?: ResponsiveString;
  align?: string | [string, string];
  marginLeft?: ResponsiveString;
  marginRight?: ResponsiveString;
  marginTop?: ResponsiveString;
  marginBottom?: ResponsiveString;
  borderRadius?: ResponsiveString;
  overflow?: "hidden" | "visible" | "auto" | "scroll";
  zIndex?: number;
  scrollSpeed?: number;
  initialX?: ResponsiveString;
  initialY?: ResponsiveString;
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  WebkitBackdropFilter?: string;
  effects?: unknown[];
}

export interface ContentBlock extends BaseSectionProps {
  type: "contentBlock";
  elements: ElementBlock[];
  contentWidth?: string | [string, string];
  contentHeight?: string | [string, string];
  reorderable?: boolean;
  reorderAxis?: "x" | "y";
}

export interface SectionColumnBlock extends BaseSectionProps {
  type: "sectionColumn";
  elements: ElementBlock[];
  columns?: number | string;
  columnAssignments?: Record<string, unknown>;
  columnWidths?: unknown;
  columnGaps?: unknown;
  columnStyles?: unknown;
  contentWidth?: string | [string, string];
  contentHeight?: string | [string, string];
}

export interface SectionBlock {
  type: SectionType;
  [key: string]: unknown;
}

/** Background block — animated/media backgrounds registered by ID. */
export interface BgBlock {
  type: string;
  [key: string]: unknown;
}

export interface PeblorPage {
  sections: SectionBlock[];
  definitions?: Record<string, unknown>;
  bgBlocks?: Record<string, BgBlock>;
}

// ---------------------------------------------------------------------------
// ContentBlock layout props (used by layout converter)
// ---------------------------------------------------------------------------

export interface ContentBlockProps {
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  padding?: string;
  paddingTop?: string | number;
  paddingRight?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  rowGap?: string | number;
  columnCount?: number;
  columnGap?: string | number;
  /** Auto-layout sizing overrides derived from layoutSizingHorizontal/Vertical. */
  width?: string;
  height?: string;
  /** Min/max size constraints from Figma's extended auto-layout API. */
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  /** Inline styles merged onto the exported group/section container. */
  wrapperStyle?: Record<string, string | number>;
  /** Flexbox `align-content` when `flexWrap` is wrap. */
  alignContent?: string;
}
