/**
 * Primitive / shared types used across peblor element and section schemas.
 */

export type ResponsiveString = string | [string, string];
export type ResponsiveNumber = number | [number, number];

export interface BorderGradient {
  stroke: string;
  width: string | number;
}

/** Raw Figma constraints; the peblor renderer turns this into CSS. */
export interface FigmaConstraintsLayout {
  horizontal?: "LEFT" | "RIGHT" | "LEFT_RIGHT" | "CENTER" | "SCALE";
  vertical?: "TOP" | "BOTTOM" | "TOP_BOTTOM" | "CENTER" | "SCALE";
  x?: number;
  y?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  parentWidth?: number;
  parentHeight?: number;
}

export interface LayoutProps {
  id?: string;
  width?: ResponsiveString;
  height?: ResponsiveString;
  marginTop?: ResponsiveString;
  marginBottom?: ResponsiveString;
  marginLeft?: ResponsiveString;
  marginRight?: ResponsiveString;
  zIndex?: number;
  align?: string | [string, string];
  alignY?: string | [string, string];
  textAlign?: string | [string, string];
  borderRadius?: ResponsiveString;
  opacity?: number;
  blendMode?: string;
  hidden?: boolean;
  overflow?: "hidden" | "visible" | "auto" | "scroll";
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  WebkitBackdropFilter?: string;
  effects?: unknown[];
  rotate?: number | string;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  textDecoration?: string;
  textTransform?: string;
  fixed?: boolean;
  priority?: boolean;
  interactions?: ElementInteractions;
  visibleWhen?: ElementVisibleWhen;
  borderGradient?: BorderGradient;
  figmaConstraints?: FigmaConstraintsLayout;
  wrapperStyle?: Record<string, string | number>;
  aria?: Record<string, string | boolean>;
}

export interface ImageCrop {
  x?: number;
  y?: number;
  scale?: number;
  focalX?: number;
  focalY?: number;
}

export interface ImageFilters {
  brightness?: number;
  contrast?: number;
  saturate?: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
  hueRotate?: number;
  invert?: number;
}

// ---------------------------------------------------------------------------
// Interactions / visibility condition types (referenced by LayoutProps above)
// ---------------------------------------------------------------------------

export type CursorType =
  | "pointer"
  | "default"
  | "grab"
  | "grabbing"
  | "crosshair"
  | "zoom-in"
  | "zoom-out"
  | "text"
  | "move"
  | "not-allowed";

export interface ElementInteractions {
  onClick?: TriggerAction;
  onHoverEnter?: TriggerAction;
  onHoverLeave?: TriggerAction;
  onPointerDown?: TriggerAction;
  onPointerUp?: TriggerAction;
  onDoubleClick?: TriggerAction;
  onDragEnd?: TriggerAction;
  cursor?: CursorType;
}

export interface ElementCondition {
  variable: string;
  operator: "equals" | "notEquals" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith";
  value: unknown;
}

export interface ElementVisibleWhen {
  variable?: string;
  operator?: "equals" | "notEquals" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith";
  value?: unknown;
  conditions?: ElementCondition[];
  logic?: "and" | "or";
}

// ---------------------------------------------------------------------------
// Trigger action type (subset of the full runtime schema)
// ---------------------------------------------------------------------------

/** Simplified trigger action type (subset of the full runtime schema). */
export type TriggerAction =
  | { type: "elementShow"; payload: { id: string } }
  | { type: "elementHide"; payload: { id: string } }
  | { type: "elementToggle"; payload: { id: string } }
  | { type: "navigate"; payload: { href: string; replace?: boolean } }
  | { type: "modalOpen"; payload: { id: string } }
  | { type: "modalClose"; payload?: { id?: string } }
  | { type: "setVariable"; payload: { key: string; value: unknown } }
  | { type: "scrollTo"; payload?: { id?: string; offset?: number } }
  | { type: string; payload?: unknown };
