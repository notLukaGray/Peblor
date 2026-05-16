import fs from "node:fs";
import path from "node:path";
import { integrationCapabilitySchema } from "@pb/contracts";
import type { CommandIo } from "./types.js";

type ValidateCapabilityArgs = {
  file?: string;
  asJson: boolean;
  help: boolean;
};

function parseArgs(args: string[]): ValidateCapabilityArgs {
  const asJson = args.includes("--json");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }
  const positional = args.filter((_, i) => !consumed.has(i));
  return { file: positional[0], asJson, help };
}

export async function runValidateCapability(args: string[], io: CommandIo): Promise<number> {
  const { file, asJson, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli validate-capability <file> [--json]");
    io.printText("\nValidates a capability declaration file against the capability schema.");
    return 0;
  }

  if (!file) {
    io.printErrorText("Error: file path is required.");
    return 2;
  }

  const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    const msg = `File not found: ${file}`;
    if (asJson)
      io.printErrorJson({ command: "validate-capability", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    const msg = `Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`;
    if (asJson)
      io.printErrorJson({ command: "validate-capability", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const result = integrationCapabilitySchema.safeParse(data);

  if (result.success) {
    const payload = {
      command: "validate-capability",
      status: "ok",
      file: filePath,
      type: result.data.type,
      name: result.data.name,
    };
    if (asJson) io.printJson(payload);
    else io.printText(`Valid ${result.data.type} capability: ${result.data.name}`);
    return 0;
  } else {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const payload = {
      command: "validate-capability",
      status: "error",
      file: filePath,
      issues,
    };
    if (asJson) io.printErrorJson(payload);
    else {
      io.printErrorText(`Invalid capability: ${file}`);
      for (const issue of issues) {
        io.printErrorText(`  ${issue.path || "$"}: ${issue.message}`);
      }
    }
    return 1;
  }
}
