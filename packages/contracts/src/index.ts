// Re-exports from peblor-schemas — the public schema surface.
// Kept as export * because peblor-schemas.ts IS the curated public API;
// maintaining a hand-written mirror here would drift instantly on every schema addition.
export * from "./peblor/core/peblor-schemas";

// Explicit re-exports from peblor-motion-defaults (replaces export *)
export {
  MOTION_DEFAULTS,
  mergeMotionDefaults,
  getEntranceMotionFromPreset,
  getExitMotionFromPreset,
} from "./peblor/core/peblor-motion-defaults";
export {
  PAGE_DENSITY_LEVELS,
  getPageDensityMultipliers,
  buildPageDensityCssVars,
  scaleSpaceForDensity,
  scaleSpaceShorthandForDensity,
  scaleRadiusForDensity,
} from "./peblor/core/page-density";

export {
  importerCapabilitySchema,
  exporterCapabilitySchema,
  cmsAdapterCapabilitySchema,
  integrationCapabilitySchema,
  type ImporterCapability,
  type ExporterCapability,
  type CmsAdapterCapability,
  type IntegrationCapability,
} from "./capability-schemas";

export {
  ANALYTICS_EVENT_NAMES,
  analyticsCommonPayloadSchema,
  analyticsEventPayloadSchema,
  analyticsConfigSchema,
  type AnalyticsEventName,
  type AnalyticsEventKey,
  type AnalyticsEventPayload,
  type AnalyticsConfig,
} from "./analytics";

export { CONTRACT_VERSION, SUPPORTED_CONTRACT_VERSIONS } from "./version";

export type { StyleObject } from "./peblor/core/types/style-object";

export type { JsonPrimitive, JsonValue, JsonObject } from "./core/lib/json-value";

export {
  sectionBlockSchema as sectionSchema,
  elementBlockSchema as elementSchema,
  moduleBlockSchema as moduleSchema,
  formFieldBlockSchema as formFieldSchema,
} from "./peblor/core/peblor-schemas";
