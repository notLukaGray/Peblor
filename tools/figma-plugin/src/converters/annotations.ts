/**
 * Barrel — re-exports all annotation parsing utilities.
 * No logic lives here.
 */

export type { SemanticTextStyle } from "./annotations-parse";
export {
  parseAnnotations,
  stripAnnotations,
  annotationFlag,
  annotationNumber,
  parseAnnotationValue,
  parseTextStyleAnnotation,
} from "./annotations-parse";

export { parseTriggerShorthand } from "./annotations-trigger";

export { parseElementInteractionAnnotations } from "./annotations-interactions";
