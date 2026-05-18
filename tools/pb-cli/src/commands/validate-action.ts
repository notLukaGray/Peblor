import { CONTRACT_VERSION, triggerActionSchema } from "@pb/contracts";
import { readJsonFile } from "../lib/json-file.js";
import { mapZodIssues } from "../lib/zod-diagnostics.js";
import type { CommandIo } from "./types.js";

export async function runValidateAction(args: string[], io: CommandIo): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    io.printText("Usage: pb-cli validate-action <file> [--json]");
    return 0;
  }
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) {
    io.printUsage();
    return 2;
  }

  const read = readJsonFile(file);
  if (!read.ok) {
    io.printErrorJson({
      command: "validate-action",
      file,
      contractVersion: CONTRACT_VERSION,
      valid: false,
      diagnostics: [
        {
          severity: "error",
          code: "PB_FILE_ERROR",
          path: "$",
          message: "error" in read ? read.error : "Read failed",
        },
      ],
    });
    return 2;
  }

  const parsed = triggerActionSchema.safeParse(read.value);
  const diagnostics = parsed.success ? [] : mapZodIssues(parsed.error, "PB_ACTION_INVALID");

  const payload = {
    command: "validate-action",
    file,
    contractVersion: CONTRACT_VERSION,
    valid: parsed.success,
    diagnostics,
  };
  if (parsed.success) {
    io.printJson(payload);
    return 0;
  }
  io.printErrorJson(payload);
  return 1;
}
