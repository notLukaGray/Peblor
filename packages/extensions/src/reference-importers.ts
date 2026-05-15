import fs from "node:fs/promises";
import path from "node:path";
import {
  CONTRACT_VERSION,
  peblorSchema,
  type ImporterCapability,
  type Peblor,
} from "@pb/contracts";
import type { PeblorDiagnostic } from "@pb/core/validate";
import type { ImportResult, ImporterPlugin } from "./index";

type ReferenceFileSource = {
  path: string;
};

type ThirdPartySource =
  | { payload: unknown; metadata?: Record<string, unknown> }
  | { records: Array<{ document: unknown; sourceId?: string }> };

function diagnostic(
  code: string,
  message: string,
  severity: PeblorDiagnostic["severity"] = "error",
  pathValue = "$"
): PeblorDiagnostic {
  return {
    code,
    severity,
    path: pathValue,
    message,
    contractVersion: CONTRACT_VERSION,
  };
}

function parsePageCandidate(value: unknown): {
  page: Peblor | null;
  diagnostics: PeblorDiagnostic[];
} {
  const parsed = peblorSchema.safeParse(value);
  if (parsed.success) {
    return { page: parsed.data, diagnostics: [] };
  }

  const firstIssue = parsed.error.issues[0];
  const issuePath =
    firstIssue && firstIssue.path.length > 0
      ? `$${firstIssue.path.map((segment) => `[${String(segment)}]`).join("")}`
      : "$";
  return {
    page: null,
    diagnostics: [
      diagnostic(
        "PB_EXT_IMPORT_INVALID_PAGE",
        firstIssue?.message ?? "Imported payload is not a valid peblor document.",
        "error",
        issuePath
      ),
    ],
  };
}

async function importFromFileSource(source: unknown): Promise<ImportResult> {
  if (
    !source ||
    typeof source !== "object" ||
    typeof (source as ReferenceFileSource).path !== "string"
  ) {
    return {
      pages: [],
      diagnostics: [
        diagnostic(
          "PB_EXT_IMPORT_INVALID_SOURCE",
          'Expected source shape: { "path": "<absolute-or-relative-json-path>" }.'
        ),
      ],
      unsupported: [],
    };
  }

  const inputPath = (source as ReferenceFileSource).path;
  const resolved = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);

  let raw: string;
  try {
    raw = await fs.readFile(resolved, "utf8");
  } catch {
    return {
      pages: [],
      diagnostics: [diagnostic("PB_EXT_IMPORT_FILE_MISSING", `Could not read file: ${resolved}`)],
      unsupported: [],
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw) as unknown;
  } catch {
    return {
      pages: [],
      diagnostics: [
        diagnostic("PB_EXT_IMPORT_FILE_INVALID_JSON", `Invalid JSON in file: ${resolved}`),
      ],
      unsupported: [],
    };
  }

  const parsed = parsePageCandidate(parsedJson);
  return {
    pages: parsed.page ? [parsed.page] : [],
    diagnostics: parsed.diagnostics,
    unsupported: [],
  };
}

async function importFromThirdPartySource(source: unknown): Promise<ImportResult> {
  const pages: Peblor[] = [];
  const diagnostics: PeblorDiagnostic[] = [];

  if (!source || typeof source !== "object") {
    return {
      pages: [],
      diagnostics: [
        diagnostic(
          "PB_EXT_IMPORT_INVALID_SOURCE",
          "Expected third-party source object with `payload` or `records`."
        ),
      ],
      unsupported: [],
    };
  }

  const normalized = source as ThirdPartySource;
  const documents: unknown[] = Array.isArray((normalized as { records?: unknown }).records)
    ? (normalized as { records: Array<{ document: unknown }> }).records.map(
        (record) => record.document
      )
    : [(normalized as { payload?: unknown }).payload];

  for (const document of documents) {
    const parsed = parsePageCandidate(document);
    if (parsed.page) {
      pages.push(parsed.page);
    } else {
      diagnostics.push(...parsed.diagnostics);
    }
  }

  return {
    pages,
    diagnostics,
    unsupported: [],
  };
}

const referenceCapability: ImporterCapability = {
  type: "importer",
  name: "reference-json-file-importer",
  version: "1.0.0",
  supportedContractVersions: [CONTRACT_VERSION],
  supportedElementTypes: ["*"],
  supportedSectionTypes: ["*"],
  diagnosticCodes: [
    "PB_EXT_IMPORT_INVALID_SOURCE",
    "PB_EXT_IMPORT_FILE_MISSING",
    "PB_EXT_IMPORT_FILE_INVALID_JSON",
    "PB_EXT_IMPORT_INVALID_PAGE",
  ],
};

const thirdPartyCapability: ImporterCapability = {
  type: "importer",
  name: "third-party-payload-importer",
  version: "1.0.0",
  supportedContractVersions: [CONTRACT_VERSION],
  supportedElementTypes: ["*"],
  supportedSectionTypes: ["*"],
  diagnosticCodes: ["PB_EXT_IMPORT_INVALID_SOURCE", "PB_EXT_IMPORT_INVALID_PAGE"],
};

export function createReferenceJsonFileImporter(): ImporterPlugin {
  return {
    capability: referenceCapability,
    import: importFromFileSource,
  };
}

export function createThirdPartyPayloadImporter(): ImporterPlugin {
  return {
    capability: thirdPartyCapability,
    import: importFromThirdPartySource,
  };
}
