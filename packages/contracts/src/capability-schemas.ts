import { z } from "zod";

export const capabilityContractVersionSchema = z.string().min(1);

export const importerCapabilitySchema = z.object({
  type: z.literal("importer"),
  name: z.string().min(1),
  version: z.string().min(1),
  supportedContractVersions: z.array(capabilityContractVersionSchema).min(1),
  supportedElementTypes: z.array(z.string().min(1)).default([]),
  supportedSectionTypes: z.array(z.string().min(1)).default([]),
  diagnosticCodes: z.array(z.string().min(1)).default([]),
});

export const exporterCapabilitySchema = z.object({
  type: z.literal("exporter"),
  name: z.string().min(1),
  version: z.string().min(1),
  inputContractVersions: z.array(capabilityContractVersionSchema).min(1),
  outputTargets: z.array(z.string().min(1)).min(1),
  fidelityLevel: z.enum(["lossless", "high", "medium", "low"]),
  diagnosticCodes: z.array(z.string().min(1)).default([]),
});

export const cmsAdapterCapabilitySchema = z.object({
  type: z.literal("cmsAdapter"),
  name: z.string().min(1),
  version: z.string().min(1),
  cmsProvider: z.string().min(1),
  syncModes: z.array(z.enum(["pull", "push", "bidirectional"])).min(1),
  mappingFeatures: z.array(z.string().min(1)).default([]),
  conflictPolicies: z.array(z.enum(["lastWriteWins", "manualReview", "reject"])).default([]),
  diagnosticCodes: z.array(z.string().min(1)).default([]),
});

export const integrationCapabilitySchema = z.discriminatedUnion("type", [
  importerCapabilitySchema,
  exporterCapabilitySchema,
  cmsAdapterCapabilitySchema,
]);

export type ImporterCapability = z.infer<typeof importerCapabilitySchema>;
export type ExporterCapability = z.infer<typeof exporterCapabilitySchema>;
export type CmsAdapterCapability = z.infer<typeof cmsAdapterCapabilitySchema>;
export type IntegrationCapability = z.infer<typeof integrationCapabilitySchema>;
