/**
 * Component variant system — barrel.
 *
 * Converts Figma COMPONENT_SET nodes (components with variants) into
 * peblor elementGroup blocks with full interaction wiring.
 *
 * Implementation is split across:
 *   variant-state-map.ts      — state-value → interaction metadata map
 *   variant-structure-diff.ts — structural equality + visual diff extraction
 *   variant-child-helpers.ts  — child conversion, node props, transition building
 *   variant-builder.ts        — buildVariantElement orchestrator
 */

export type { VariantStateInfo, VariantGroup } from "./variant-state-map";
export {
  VARIANT_STATE_MAP,
  STATE_PROPERTY_KEYS,
  parseVariantName,
  getStateVariableKey,
  extractVariantGroup,
} from "./variant-state-map";

export { isSameStructure, extractVisualDiff } from "./variant-structure-diff";

export type { VariantTransition } from "./variant-child-helpers";
export {
  convertVariantChildren,
  extractVariantNodeProps,
  makeSetVariable,
  buildVariantTransition,
} from "./variant-child-helpers";

export { buildVariantElement } from "./variant-builder";
