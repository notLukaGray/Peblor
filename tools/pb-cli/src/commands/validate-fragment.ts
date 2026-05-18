import { CONTRACT_VERSION, motionPropsSchema, triggerActionSchema } from "@pb/contracts";
import { readJsonFile } from "../lib/json-file.js";
import { validateSectionValue } from "../lib/section-validate.js";
import { validateElementValue } from "../lib/element-validate.js";
import { validateBgValue } from "../lib/bg-validate.js";
import { validateModuleValue } from "../lib/module-validate.js";
import { mapZodIssues } from "../lib/zod-diagnostics.js";
import type { CommandIo } from "./types.js";

function validateActionValue(value: unknown): {
  valid: boolean;
  diagnostics: Array<{ severity: "error"; code: string; path: string; message: string }>;
} {
  const parsed = triggerActionSchema.safeParse(value);
  if (parsed.success) return { valid: true, diagnostics: [] };
  return { valid: false, diagnostics: mapZodIssues(parsed.error, "PB_ACTION_INVALID") };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function validateFragmentValue(value: unknown): {
  kind: string;
  valid: boolean;
  diagnostics: Array<{ severity: string; code: string; path: string; message: string }>;
} {
  let kind = "unknown";
  let result: {
    valid: boolean;
    diagnostics: Array<{ severity: string; code: string; path: string; message: string }>;
  } = {
    valid: false,
    diagnostics: [
      {
        severity: "error",
        code: "PB_FRAGMENT_UNKNOWN",
        path: "$",
        message: "Unable to infer fragment schema",
      },
    ],
  };

  if (isRecord(value) && typeof value.type === "string") {
    const t = value.type;
    if (t.startsWith("element")) {
      kind = "element";
      result = validateElementValue(value);
    } else if (t.startsWith("background")) {
      kind = "bg";
      result = validateBgValue(value);
    } else if (t === "module") {
      kind = "module";
      result = validateModuleValue(value);
    } else if (
      [
        "contentBlock",
        "scrollContainer",
        "sectionColumn",
        "revealSection",
        "divider",
        "formBlock",
        "sectionTrigger",
      ].includes(t)
    ) {
      kind = "section";
      result = validateSectionValue(value);
    } else {
      kind = "action";
      result = validateActionValue(value);
    }
  } else {
    const motion = motionPropsSchema.safeParse(value);
    if (motion.success) {
      kind = "motion";
      result = { valid: true, diagnostics: [] };
    }
  }

  return { kind, valid: result.valid, diagnostics: result.diagnostics };
}

export async function runValidateFragment(args: string[], io: CommandIo): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    io.printText("Usage: pb-cli validate-fragment <file> [--json]");
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
      command: "validate-fragment",
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

  const { kind, valid, diagnostics } = validateFragmentValue(read.value);

  const payload = {
    command: "validate-fragment",
    file,
    contractVersion: CONTRACT_VERSION,
    kind,
    valid,
    diagnostics,
  };
  if (valid) {
    io.printJson(payload);
    return 0;
  }
  io.printErrorJson(payload);
  return 1;
}
