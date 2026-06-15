/** Runtime preview draft for element dev tools (instance-level JSON; mirrors `elementLayoutSchema` runtime fields). */

export type ElementDevVisibleWhenOperator =
  | "equals"
  | "notEquals"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "startsWith";

export type ElementDevInteractionCursor =
  | ""
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

export type ElementDevRuntimeDraft = {
  linkEnabled: boolean;
  linkRef: string;
  linkExternal: boolean;
  cursor: ElementDevInteractionCursor;
  visibleWhenEnabled: boolean;
  visibleWhenVariable: string;
  visibleWhenOperator: ElementDevVisibleWhenOperator;
  visibleWhenValue: string;
  visibleWhenPreviewValue: string;
  ariaLabel: string;
  wrapperStyleJson: string;
  figmaConstraintsJson: string;
  motionJson: string;
};
