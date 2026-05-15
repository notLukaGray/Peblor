/** Re-export bridge inspection API (shared with plugin + tests). */
export type { InspectContext, InspectableNode } from "../../figma-bridge/src/index";
export type { ExportPreview, UnifiedInspectResult } from "../../figma-bridge/src/index";
export { inspectUnified } from "../../figma-bridge/src/index";
export type { HeuristicSignature, SuggestionAction } from "../../figma-bridge/src/index";
export {
  createHeuristicSignature as createRuleSignature,
  createSuggestion,
} from "../../figma-bridge/src/index";
export type { AnnotationTemplate } from "../../figma-bridge/src/index";
export {
  getAllAnnotationTemplates,
  getAnnotationTemplateTotal,
  getTopAnnotationTemplates,
} from "../../figma-bridge/src/index";
