import { CONTRACT_VERSION, sectionBlockSchema } from "@pb/contracts";
import { readJsonFile } from "../lib/json-file.js";
import { mapZodIssues } from "../lib/zod-diagnostics.js";
import type { CommandIo } from "./types.js";

export async function runValidateOverlayFragment(args: string[], io: CommandIo): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    io.printText("Usage: pb-cli validate-overlay-fragment <file> [--json]");
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
      command: "validate-overlay-fragment",
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

  const parsed = sectionBlockSchema.safeParse(read.value);
  const diagnostics = parsed.success ? [] : mapZodIssues(parsed.error, "PB_OVERLAY_INVALID");

  const payload = {
    command: "validate-overlay-fragment",
    file,
    contractVersion: CONTRACT_VERSION,
    schema: "sectionBlockSchema",
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
