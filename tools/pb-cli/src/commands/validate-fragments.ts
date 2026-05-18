import fs from "node:fs";
import path from "node:path";
import { CONTRACT_VERSION, triggerActionSchema, sectionBlockSchema } from "@pb/contracts";
import { validateSectionValue } from "../lib/section-validate.js";
import { validateElementValue } from "../lib/element-validate.js";
import { validateBgValue } from "../lib/bg-validate.js";
import { validateModuleValue } from "../lib/module-validate.js";
import { readJsonFile } from "../lib/json-file.js";
import { mapZodIssues } from "../lib/zod-diagnostics.js";
import type { CommandIo } from "./types.js";
import { validateFragmentValue } from "./validate-fragment.js";

type Kind = "section" | "element" | "action" | "bg" | "module" | "overlay" | "fragment";

function listJsonFiles(dir: string): string[] {
  const out: string[] = [];
  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".json")) out.push(full);
    }
  }
  walk(dir);
  return out.sort((a, b) => a.localeCompare(b));
}

export async function runValidateFragments(args: string[], io: CommandIo): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    io.printText(
      "Usage: pb-cli validate-fragments <dir> --kind <section|element|action|bg|module|overlay|fragment> [--json]"
    );
    return 0;
  }
  const kindIndex = args.indexOf("--kind");
  const kind = (kindIndex >= 0 ? args[kindIndex + 1] : undefined) as Kind | undefined;
  const dir = args.find((arg, idx) => !arg.startsWith("--") && idx !== kindIndex + 1);
  if (!dir || !kind) {
    io.printUsage();
    return 2;
  }
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    io.printErrorJson({
      command: "validate-fragments",
      status: "error",
      message: `Dir not found: ${dir}`,
    });
    return 2;
  }

  const files = listJsonFiles(dir);
  const results = files.map((file) => {
    const read = readJsonFile(file);
    if (!read.ok) {
      return {
        file,
        valid: false,
        diagnostics: [
          {
            severity: "error",
            code: "PB_FILE_ERROR",
            path: "$",
            message: "error" in read ? read.error : "Read failed",
          },
        ],
      };
    }

    if (kind === "fragment") return { file, ...validateFragmentValue(read.value) };
    if (kind === "section") return { file, ...validateSectionValue(read.value) };
    if (kind === "element") return { file, ...validateElementValue(read.value) };
    if (kind === "bg") return { file, ...validateBgValue(read.value) };
    if (kind === "module") return { file, ...validateModuleValue(read.value) };
    if (kind === "overlay") {
      const parsed = sectionBlockSchema.safeParse(read.value);
      return {
        file,
        valid: parsed.success,
        diagnostics: parsed.success ? [] : mapZodIssues(parsed.error, "PB_OVERLAY_INVALID"),
      };
    }
    const parsed = triggerActionSchema.safeParse(read.value);
    return {
      file,
      valid: parsed.success,
      diagnostics: parsed.success ? [] : mapZodIssues(parsed.error, "PB_ACTION_INVALID"),
    };
  });

  const total = results.length;
  const invalid = results.filter((r) => !r.valid);
  const payload = {
    command: "validate-fragments",
    contractVersion: CONTRACT_VERSION,
    kind,
    dir,
    total,
    invalid: invalid.length,
    results,
  };
  if (invalid.length > 0) {
    io.printErrorJson(payload);
    return 1;
  }
  io.printJson(payload);
  return 0;
}
