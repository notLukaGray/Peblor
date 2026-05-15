import { CONTRACT_VERSION } from "@pb/contracts";
import type { DiffResult } from "@pb/sdk";
import { readJsonFile, isRecord } from "../lib/json-file.js";
import type { CommandIo } from "./types.js";

type PbClient = {
  validate: (value: unknown) => Promise<{ valid: boolean; diagnostics: unknown[] }>;
  diff: (a: unknown, b: unknown) => Promise<DiffResult>;
  migrate: (
    value: unknown,
    opts: { from?: string; to: string }
  ) => Promise<{
    page: unknown;
    fromVersion: string;
    toVersion: string;
    appliedTransforms: string[];
    diagnostics: Array<{ severity: string }>;
  }>;
};

function fileError(message: string): Record<string, unknown> {
  return {
    code: "PB_FILE_ERROR",
    severity: "error",
    path: "$",
    message,
    contractVersion: CONTRACT_VERSION,
  };
}

export async function runValidate(pb: PbClient, io: CommandIo, filePath: string): Promise<number> {
  const read = readJsonFile(filePath);
  if (!read.ok) {
    io.printErrorJson({
      command: "validate",
      file: filePath,
      valid: false,
      diagnostics: [fileError("error" in read ? read.error : "Read failed")],
    });
    return 2;
  }

  const result = await pb.validate(read.value);
  const payload = {
    command: "validate",
    file: filePath,
    contractVersion: CONTRACT_VERSION,
    valid: result.valid,
    diagnostics: result.diagnostics,
  };
  if (result.valid) {
    io.printJson(payload);
    return 0;
  }
  io.printErrorJson(payload);
  return 1;
}

export async function runDiff(
  pb: PbClient,
  io: CommandIo,
  fileA: string,
  fileB: string
): Promise<number> {
  const readA = readJsonFile(fileA);
  const readB = readJsonFile(fileB);
  if (!readA.ok || !readB.ok) {
    io.printErrorJson({
      command: "diff",
      contractVersion: CONTRACT_VERSION,
      changes: [],
      diagnostics: [
        ...(!readA.ok ? [fileError("error" in readA ? readA.error : "Read failed")] : []),
        ...(!readB.ok ? [fileError("error" in readB ? readB.error : "Read failed")] : []),
      ],
    });
    return 2;
  }

  const diff = await pb.diff(readA.value, readB.value);
  io.printJson({ command: "diff", ...diff });
  return 0;
}

export async function runMigrate(
  pb: PbClient,
  io: CommandIo,
  filePath: string,
  args: string[]
): Promise<number> {
  const read = readJsonFile(filePath);
  if (!read.ok) {
    io.printErrorJson({
      command: "migrate",
      status: "error",
      file: filePath,
      diagnostics: [fileError("error" in read ? read.error : "Read failed")],
    });
    return 2;
  }

  const fromIndex = args.indexOf("--from");
  const toIndex = args.indexOf("--to");
  const from = fromIndex >= 0 ? args[fromIndex + 1] : undefined;
  const to = toIndex >= 0 ? (args[toIndex + 1] ?? CONTRACT_VERSION) : CONTRACT_VERSION;
  const result = await pb.migrate(read.value, { from, to });

  if (isRecord(result.page)) {
    process.stdout.write(`${JSON.stringify(result.page, null, 2)}\n`);
  } else {
    io.printJson({ command: "migrate", page: result.page });
  }

  io.printErrorJson({
    command: "migrate",
    fromVersion: result.fromVersion,
    toVersion: result.toVersion,
    appliedTransforms: result.appliedTransforms,
    diagnostics: result.diagnostics,
  });
  return result.diagnostics.some((diagnostic) => diagnostic.severity === "error") ? 1 : 0;
}
