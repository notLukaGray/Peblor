import {
  analyzeBlockCapabilities,
  type AnalyzeBlockCapabilitiesInput,
  type AnalyzeBlockCapabilitiesResult,
} from "./block-capabilities";

/**
 * Analyzes section capabilities as if there is no background.
 * Used in "background-island" render mode where the background is independently
 * isolated and should not force sections to be client-classified.
 */
export function analyzeSectionOnlyCapabilities(
  input: AnalyzeBlockCapabilitiesInput
): AnalyzeBlockCapabilitiesResult {
  return analyzeBlockCapabilities({
    ...input,
    // Treat bg as null — removes "client-background" and "page-runtime" from bg-related reasons
    resolvedBg: null,
    transitions: undefined,
  });
}
