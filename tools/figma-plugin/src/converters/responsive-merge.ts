/**
 * Barrel — re-exports all responsive merge utilities.
 * No logic lives here.
 */

export { SECTION_RESPONSIVE_KEYS, ELEMENT_RESPONSIVE_KEYS } from "./responsive-field-sets";
export type { AnyObj } from "./responsive-element-merge";
export { valuesEqual, mergeElements, mergeElementArrays } from "./responsive-element-merge";
export { mergeResponsiveSections } from "./responsive-section-merge";
