/**
 * Barrel — re-exports all fill extraction utilities.
 * No logic lives here.
 */

export { variableNameToCssVar, resolveVariableAlias, extractSolidFill } from "./fills-solid";
export { extractGradientFill } from "./fills-gradient";
export {
  extractImageFill,
  extractFill,
  extractMultipleFills,
  extractSectionFillPayload,
  figmaScaleModeToObjectFit,
  exportImageFillAsset,
} from "./fills-image";
