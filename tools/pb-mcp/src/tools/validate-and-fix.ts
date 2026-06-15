import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

type Diagnostic = { path?: string; message?: string; code?: string; severity?: string };

function suggestFix(d: Diagnostic): string {
  const path = d.path ?? "$";
  const message = (d.message ?? "").toLowerCase();
  if (path.includes("action") && message.includes("payload")) {
    return 'Wrap action fields inside payload: { "type": "...", "payload": { ... } }';
  }
  if (path.includes("bgKey")) {
    return "Remove bgKey from section/fragment files; bgKey belongs in page index.json only.";
  }
  if (message.includes("invalid discriminator value") || message.includes("expected 'element")) {
    return "Check the `type` literal exactly matches schema values (case-sensitive).";
  }
  if (message.includes("expected array") && path.includes("elements")) {
    return 'Provide "elements": [] (or valid element array) at this path.';
  }
  if (message.includes("required") || message.includes("missing")) {
    return "Add the missing required field shown in the diagnostic path.";
  }
  if (message.includes("unrecognized keys") || message.includes("unknown key")) {
    return "Remove the unrecognized field at this path — it is not in the schema.";
  }
  if (message.includes("expected string")) {
    return "Change this value to a string.";
  }
  if (message.includes("expected number")) {
    return "Change this value to a number.";
  }
  if (message.includes("expected boolean")) {
    return "Change this value to true or false.";
  }
  if (message.includes("expected object")) {
    return "Change this value to an object { }.";
  }
  return "Inspect this path and align field shape/type with the Peblor schema.";
}

export const validateAndFix: Tool = {
  def: {
    name: "validate_and_fix",
    description: [
      "Validate a Peblor page JSON and, if invalid, return structured fix suggestions for each failing path.",
      "Use this in the validate→fix loop: call with JSON, get back valid=true or valid=false + fixes.",
      "On valid=false: apply each fix suggestion and retry (up to 3 attempts).",
      "After 3 failed attempts, surface the error paths to the user.",
      "Accepts 'json' (inline JSON string) or 'file' (absolute path).",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: {
        json: {
          type: "string",
          description: "Inline page JSON string to validate. Use this for draft generation.",
        },
        file: {
          type: "string",
          description: "Absolute path to a page JSON file.",
        },
        attempt: {
          type: "number",
          description:
            "Which retry attempt this is (1, 2, or 3). Used for context in the response.",
        },
      },
    },
  },
  run: async (args) => {
    const { json, file, attempt } = args as { json?: string; file?: string; attempt?: number };
    if (!file && !json) throw new Error("Either 'file' or 'json' must be provided");

    let tmp: string | null = null;
    let validationResult: {
      valid?: boolean;
      diagnostics?: Diagnostic[];
      [key: string]: unknown;
    };

    try {
      if (json) {
        tmp = join(tmpdir(), `pb-validate-fix-${Date.now()}.json`);
        await writeFile(tmp, json, "utf-8");
        validationResult = (await runCli(["validate", tmp])) as typeof validationResult;
      } else {
        validationResult = (await runCli(["validate", file!])) as typeof validationResult;
      }
    } finally {
      if (tmp)
        await unlink(tmp).catch((err) =>
          console.warn("[pb-mcp] Failed to clean up temp file", tmp, err)
        );
    }

    const diagnostics = (validationResult.diagnostics as Diagnostic[] | undefined) ?? [];
    const errorDiagnostics = diagnostics.filter((d) => !d.severity || d.severity === "error");
    const isValid = validationResult.valid === true || errorDiagnostics.length === 0;

    if (isValid) {
      return {
        valid: true,
        attempt: attempt ?? 1,
        message: "Page JSON is valid.",
      };
    }

    const fixes = errorDiagnostics.map((d) => ({
      path: d.path ?? "$",
      code: d.code ?? "UNKNOWN",
      message: d.message ?? "",
      suggestion: suggestFix(d),
    }));

    const fixPrompt = [
      `The following Peblor page JSON failed validation on attempt ${attempt ?? 1}.`,
      "Fix ONLY the paths listed below. Do not change content intent. Return corrected JSON only.",
      "",
      "Failing paths:",
      ...fixes.map((f) => `  ${f.path}: ${f.message} → ${f.suggestion}`),
    ].join("\n");

    return {
      valid: false,
      attempt: attempt ?? 1,
      errorCount: fixes.length,
      fixes,
      fixPrompt,
      rawDiagnostics: errorDiagnostics,
    };
  },
};
