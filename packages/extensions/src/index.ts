import type {
  CmsAdapterCapability,
  ExporterCapability,
  ImporterCapability,
  Peblor,
} from "@pb/contracts";
import type { PeblorDiagnostic } from "@pb/core/validate";

export type UnsupportedConstruct = {
  code: string;
  path: string;
  description: string;
};

export type ImportResult = {
  pages: unknown[];
  diagnostics: PeblorDiagnostic[];
  unsupported: UnsupportedConstruct[];
};

export type ExportResult = {
  target: string;
  output: unknown;
  diagnostics: PeblorDiagnostic[];
};

export type CmsSyncResult = {
  diagnostics: PeblorDiagnostic[];
  changedIds: string[];
};

export type ImporterPlugin = {
  capability: ImporterCapability;
  import: (source: unknown) => Promise<ImportResult>;
};

export type ExporterPlugin = {
  capability: ExporterCapability;
  export: (page: Peblor) => Promise<ExportResult>;
};

export type CmsAdapterPlugin = {
  capability: CmsAdapterCapability;
  pull?: (query: unknown) => Promise<ImportResult>;
  push?: (pages: Peblor[]) => Promise<CmsSyncResult>;
};

export type AnyPbPlugin = ImporterPlugin | ExporterPlugin | CmsAdapterPlugin;

export {
  runImporterFixtureSuite,
  runExporterFixtureSuite,
  type FixtureScorecard,
  type ImporterFixture,
  type ExporterFixture,
} from "./testkit";
export {
  createReferenceJsonFileImporter,
  createThirdPartyPayloadImporter,
} from "./reference-importers";
export { createReferenceJsonExporter } from "./reference-exporters";
