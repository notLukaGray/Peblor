export * from "./peblor/core/peblor-schemas";
export * from "./peblor/core/peblor-motion-defaults";
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

export type { JsonPrimitive, JsonValue, JsonObject } from "./core/lib/json-value";

export {
  sectionBlockSchema as sectionSchema,
  elementBlockSchema as elementSchema,
  moduleBlockSchema as moduleSchema,
  formFieldBlockSchema as formFieldSchema,
} from "./peblor/core/peblor-schemas";
