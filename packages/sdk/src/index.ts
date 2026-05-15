import { CONTRACT_VERSION } from "@pb/contracts";
import { loadPage } from "@pb/core/load";
import { migratePage, type MigrationResult } from "@pb/core/migrate";
import { validatePage, type PeblorDiagnostic, type ValidatePageResult } from "@pb/core/validate";

export type DiffChange = {
  path: string;
  from: unknown;
  to: unknown;
  breaking: boolean;
};

export type DiffResult = {
  contractVersion: string;
  changeCount: number;
  changes: DiffChange[];
};

export type PbClientOptions = {
  contractVersion?: string;
};

export type PbMigrateOptions = {
  from?: string;
  to: string;
};

export type PbClient = {
  validate: (page: unknown) => Promise<ValidatePageResult>;
  diff: (pageA: unknown, pageB: unknown) => Promise<DiffResult>;
  migrate: (page: unknown, options: PbMigrateOptions | string) => Promise<MigrationResult>;
  load: (source: string) => Promise<unknown>;
};

const MAX_INPUT_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_DIFF_DEPTH = 32;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function toPath(base: string, key: string | number): string {
  if (typeof key === "number") return `${base}[${key}]`;
  if (base === "$") return `${base}.${key}`;
  return `${base}.${key}`;
}

function estimateInputSize(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function assertInputSize(value: unknown, label: string): void {
  if (estimateInputSize(value) > MAX_INPUT_SIZE_BYTES) {
    throw new Error(`${label} exceeds max supported payload size (${MAX_INPUT_SIZE_BYTES} bytes)`);
  }
}

function diffValues(
  a: unknown,
  b: unknown,
  basePath = "$",
  out: DiffChange[] = [],
  depth = 0
): DiffChange[] {
  if (depth > MAX_DIFF_DEPTH) {
    throw new Error(`Diff recursion depth exceeded ${MAX_DIFF_DEPTH} at ${basePath}`);
  }
  if (Object.is(a, b)) return out;

  if (Array.isArray(a) && Array.isArray(b)) {
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      diffValues(a[i], b[i], toPath(basePath, i), out, depth + 1);
    }
    return out;
  }

  if (isRecord(a) && isRecord(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of Array.from(keys).sort()) {
      diffValues(a[key], b[key], toPath(basePath, key), out, depth + 1);
    }
    return out;
  }

  out.push({
    path: basePath,
    from: a,
    to: b,
    breaking: a !== undefined && b === undefined,
  });

  return out;
}

function inferFromVersion(page: unknown, fallback: string): string {
  if (!isRecord(page)) return fallback;
  const version = page.contractVersion;
  return typeof version === "string" && version.length > 0 ? version : fallback;
}

function withContractVersion(
  contractVersion: string,
  diagnostics: PeblorDiagnostic[]
): PeblorDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    contractVersion: diagnostic.contractVersion || contractVersion,
  }));
}

export function createPbClient(options: PbClientOptions = {}): PbClient {
  const contractVersion = options.contractVersion ?? CONTRACT_VERSION;

  return {
    async validate(page: unknown): Promise<ValidatePageResult> {
      assertInputSize(page, "validate(page)");
      const result = validatePage(page);
      return {
        ...result,
        diagnostics: withContractVersion(contractVersion, result.diagnostics),
      };
    },

    async diff(pageA: unknown, pageB: unknown): Promise<DiffResult> {
      assertInputSize(pageA, "diff(pageA)");
      assertInputSize(pageB, "diff(pageB)");
      const changes = diffValues(pageA, pageB);
      return {
        contractVersion,
        changeCount: changes.length,
        changes,
      };
    },

    async migrate(page: unknown, optionsOrTo: PbMigrateOptions | string): Promise<MigrationResult> {
      const options =
        typeof optionsOrTo === "string" ? { to: optionsOrTo, from: undefined } : optionsOrTo;
      const fromVersion = options.from ?? inferFromVersion(page, contractVersion);
      const result = migratePage(page, fromVersion, options.to);
      return {
        ...result,
        diagnostics: withContractVersion(contractVersion, result.diagnostics),
      };
    },

    async load(source: string): Promise<unknown> {
      const loaded = await loadPage(source);
      return loaded.validate?.page ?? loaded.raw;
    },
  };
}

export type { MigrationResult, PeblorDiagnostic, ValidatePageResult };
