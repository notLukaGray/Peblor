import { CONTRACT_VERSION, type ExporterCapability, type Peblor } from "@pb/contracts";
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
  return structuredClone(page) as Peblor;
}

async function exportToJsonTarget(page: Peblor): Promise<ExportResult> {
  return {
    target: "peblor-json",
    output: deepClonePage(page),
    diagnostics: [],
  };
}

export function createReferenceJsonExporter(): ExporterPlugin {
  return {
    capability: referenceCapability,
    export: exportToJsonTarget,
  };
}
