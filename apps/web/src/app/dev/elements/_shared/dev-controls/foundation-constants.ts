/** Universal option lists aligned with `elementLayoutSchema` / element foundation. */

export const OVERFLOW_OPTIONS = ["visible", "hidden", "auto", "scroll"] as const;

export const BLEND_MODE_OPTIONS = [
  "",
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
  "plus-lighter",
  "glass",
] as const;

export const ALIGN_OPTIONS = ["left", "center", "right"] as const;
export const ALIGN_Y_OPTIONS = ["top", "center", "bottom"] as const;

/** `elementTextAlignSchema` */
export const TEXT_ALIGN_OPTIONS = ["left", "center", "right", "justify"] as const;

/** Media geometry: `elementImageObjectFitSchema` */
export const OBJECT_FIT_OPTIONS = ["cover", "contain", "fillWidth", "fillHeight", "crop"] as const;

/** Common `object-position` values (CSS keywords); single-axis entries use implicit center on the other axis. */
export const OBJECT_POSITION_OPTIONS = [
  "center",
  "left top",
  "center top",
  "right top",
  "left center",
  "center center",
  "right center",
  "left bottom",
  "center bottom",
  "right bottom",
  "left",
  "right",
  "top",
  "bottom",
] as const;

export const INTERACTION_CURSOR_OPTIONS = [
  "",
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
] as const;

export const VISIBLE_WHEN_OPERATOR_OPTIONS = [
  "equals",
  "notEquals",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "startsWith",
] as const;
