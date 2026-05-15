/**
 * Responsive field key sets — fields that support [mobileValue, desktopValue] tuple format.
 */

/**
 * Section-level fields that support the [mobileValue, desktopValue] tuple format.
 */
export const SECTION_RESPONSIVE_KEYS: Set<string> = new Set([
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "align",
  "marginLeft",
  "marginRight",
  "marginTop",
  "marginBottom",
  "borderRadius",
  "initialX",
  "initialY",
  "stickyOffset",
  "fixedOffset",
  "columns",
  "columnAssignments",
  "columnWidths",
  "columnGaps",
  "columnStyles",
  "columnSpan",
  "itemLayout",
  "gridMode",
  "gridAutoRows",
  "elementOrder",
]);

/**
 * Element-level fields that support the [mobileValue, desktopValue] tuple format.
 */
export const ELEMENT_RESPONSIVE_KEYS: Set<string> = new Set([
  "width",
  "height",
  "borderRadius",
  "align",
  "alignY",
  "textAlign",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "gap",
  "padding",
  "level",
  "objectFit",
]);
