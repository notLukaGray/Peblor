import { isRecord } from "@pb/core";
import { CONTRACT_VERSION, motionPropsSchema, triggerActionSchema } from "@pb/contracts";
import { readJsonFile } from "../lib/json-file.js";
import { validateSectionValue } from "../lib/section-validate.js";
import { validateElementValue } from "../lib/element-validate.js";
import { validateBgValue } from "../lib/bg-validate.js";
import { validateModuleValue } from "../lib/module-validate.js";
import { mapZodIssues } from "../lib/zod-diagnostics.js";
import { inferFragmentKind } from "../lib/fragment-kind.js";
import type { CommandIo } from "./types.js";

function validateActionValue(value: unknown): {
  valid: boolean;
  diagnostics: Array<{ severity: "error"; code: string; path: string; message: string }>;
} {
  const parsed = triggerActionSchema.safeParse(value);
  if (parsed.success) return { valid: true, diagnostics: [] };
  return { valid: false, diagnostics: mapZodIssues(parsed.error, "PB_ACTION_INVALID") };
}

export function validateFragmentValue(value: unknown): {
  kind: string;
  valid: boolean;
  diagnostics: Array<{ severity: string; code: string; path: string; message: string }>;
} {
  const inferredKind = inferFragmentKind(value);

  // Identify the concrete value to validate: handle preset file wrappers.
  let target = value;
  if (inferredKind === "fragment" && isRecord(value)) {
    // No type at root — check if it's a preset wrapper or a motion object.
    const motion = motionPropsSchema.safeParse(value);
    if (motion.success) {
      return { kind: "motion", valid: true, diagnostics: [] };
    }
    return {
      kind: "fragment",
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
  }

  // For preset wrappers, the inferred kind was derived from the inner value —
  // we need to validate the inner value, not the wrapper.
  if (isRecord(value) && typeof (value as Record<string, unknown>).type !== "string") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (isRecord(v) && typeof v.type === "string") {
        target = v;
        break;
      }
    }
  }

  let result: {
    valid: boolean;
    diagnostics: Array<{ severity: string; code: string; path: string; message: string }>;
  };

  switch (inferredKind) {
    case "element":
      result = validateElementValue(target);
      break;
    case "bg":
      result = validateBgValue(target);
      break;
    case "module":
      result = validateModuleValue(target);
      break;
    case "section":
      result = validateSectionValue(target);
      break;
    case "action":
      result = validateActionValue(target);
      break;
    default:
      result = {
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
  }

  return { kind: inferredKind, valid: result.valid, diagnostics: result.diagnostics };
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
