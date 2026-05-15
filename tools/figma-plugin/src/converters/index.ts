/**
 * Converters barrel — re-exports all public converter functions.
 */

export { convertFrameToSection } from "./node-to-section";
export { convertNode } from "./node-to-element";
export { convertTextNode } from "./text";
export { convertImageNode } from "./image";
export { convertVectorNode } from "./vector";
export {
  extractSolidFill,
  extractImageFill,
  extractGradientFill,
  extractFill,
  figmaScaleModeToObjectFit,
} from "./fills";
export { extractLayoutProps, extractAutoLayoutProps } from "./layout";
export { extractBoxShadow, extractFilter, extractBackdropFilter } from "./effects";
export {
  inferHeadingLevel,
  inferBodyLevel,
  isLikelyHeading,
  extractTypographyOverrides,
  figmaLetterSpacingToCSS,
} from "./typography";
export {
  parseAnnotations,
  stripAnnotations,
  parseTriggerShorthand,
  annotationFlag,
  annotationNumber,
  parseAnnotationValue,
  parseElementInteractionAnnotations,
} from "./annotations";
export { extractPrototypeInteractions } from "./prototype-interactions";
export { isLikelyButton, convertButtonNode } from "./button";
export { isColumnLayout, convertFrameToColumnSection } from "./section-column";
export { isRevealLayout, convertFrameToRevealSection } from "./section-reveal";
export { parseSectionTriggerProps } from "./section-triggers";
export { isVideoNode, convertVideoNode } from "./video";
export { extractComponentProps } from "./component-props";
export { extractBorderProps } from "./layout";
export type { BorderProps } from "./layout";
export {
  buildVariantElement,
  extractVariantGroup,
  getStateVariableKey,
  VARIANT_STATE_MAP,
} from "./component-variants";
export type { VariantGroup, VariantStateInfo } from "./component-variants";
