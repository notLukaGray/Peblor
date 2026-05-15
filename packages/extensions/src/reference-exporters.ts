import { CONTRACT_VERSION, type ExporterCapability, type Peblor } from "@pb/contracts";
import type { PeblorDiagnostic } from "@pb/core/validate";
import type { ExportResult, ExporterPlugin } from "./index";

const referenceCapability: ExporterCapability = {
  type: "exporter",
  name: "reference-json-exporter",
  version: "1.0.0",
  inputContractVersions: [CONTRACT_VERSION],
  outputTargets: ["peblor-json"],
  fidelityLevel: "lossless",
  diagnosticCodes: [],
};

function deepClonePage(page: Peblor): Peblor {
  return JSON.parse(JSON.stringify(page)) as Peblor;
}

function emptyDiagnostics(): PeblorDiagnostic[] {
  return [];
}

async function exportToJsonTarget(page: Peblor): Promise<ExportResult> {
  return {
    target: "peblor-json",
    output: deepClonePage(page),
    diagnostics: emptyDiagnostics(),
  };
}

export function createReferenceJsonExporter(): ExporterPlugin {
  return {
    capability: referenceCapability,
    export: exportToJsonTarget,
  };
}
