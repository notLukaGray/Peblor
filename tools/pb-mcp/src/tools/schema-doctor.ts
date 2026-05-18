import { writeFile, unlink } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";
import { scaffoldActionTypeTool } from "./scaffold-action-type.js";
import { scaffoldBgTypeTool } from "./scaffold-bg-type.js";
import { scaffoldElementTypeTool } from "./scaffold-element-type.js";
import { scaffoldSectionTypeTool } from "./scaffold-section-type.js";

type Kind = "section" | "element" | "action" | "bg" | "module" | "overlay" | "fragment";

function inferKind(value: unknown): Kind {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "fragment";
  const rec = value as Record<string, unknown>;
  const type = typeof rec.type === "string" ? rec.type : "";
  if (type.startsWith("element")) return "element";
  if (type.startsWith("background")) return "bg";
  if (type === "module") return "module";
  if (
    [
      "contentBlock",
      "scrollContainer",
      "sectionColumn",
      "revealSection",
      "divider",
      "formBlock",
      "sectionTrigger",
    ].includes(type)
  ) {
    return "section";
  }
  if (type) return "action";
  return "fragment";
}

function validatorCommand(kind: Kind): string {
  if (kind === "section") return "validate-section";
  if (kind === "element") return "validate-element";
  if (kind === "action") return "validate-action";
  if (kind === "bg") return "validate-bg";
  if (kind === "module") return "validate-module-fragment";
  if (kind === "overlay") return "validate-overlay-fragment";
  return "validate-fragment";
}

function suggest(path: string, message: string): string {
  const msg = message.toLowerCase();
  if (path.includes("payload") || (path.includes("action") && msg.includes("object"))) {
    return "Wrap action fields in payload: { type, payload: { ... } }";
  }
  if (path.includes("bgKey"))
    return "Remove bgKey from fragments; only page index.json supports bgKey.";
  if (msg.includes("invalid discriminator value"))
    return "Check `type` literal exactly matches allowed values.";
  if (msg.includes("required")) return "Add the missing required field at this path.";
  return "Match this field shape/type to schema expectations.";
}

async function scaffoldHint(value: unknown, kind: Kind): Promise<unknown | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const type = (value as Record<string, unknown>).type;
  if (typeof type !== "string") return null;
  if (kind === "element")
    return ((await scaffoldElementTypeTool.run({ type })) as { scaffold: unknown }).scaffold;
  if (kind === "section")
    return ((await scaffoldSectionTypeTool.run({ type })) as { scaffold: unknown }).scaffold;
  if (kind === "action")
    return ((await scaffoldActionTypeTool.run({ type })) as { scaffold: unknown }).scaffold;
  if (kind === "bg")
    return ((await scaffoldBgTypeTool.run({ type })) as { scaffold: unknown }).scaffold;
  return null;
}

async function runCliSafe(args: string[]): Promise<Record<string, unknown>> {
  try {
    return (await runCli(args)) as Record<string, unknown>;
  } catch (err) {
    if (err && typeof err === "object") {
      const e = err as { stdout?: string; stderr?: string };
      const raw = e.stdout?.trim() || e.stderr?.trim();
      if (raw) {
        try {
          return JSON.parse(raw) as Record<string, unknown>;
        } catch {}
      }
    }
    throw err;
  }
}

export const schemaDoctor: Tool = {
  def: {
    name: "schema_doctor",
    description:
      "Unified fragment doctor: infer kind, validate, suggest fixes, and provide scaffold hints from one call.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute file path to diagnose" },
        json: { type: "string", description: "Inline JSON fragment to diagnose" },
        kind: {
          type: "string",
          enum: ["section", "element", "action", "bg", "module", "overlay", "fragment"],
          description: "Optional explicit kind override",
        },
      },
    },
  },
  run: async (args) => {
    const { file, json, kind } = args as { file?: string; json?: string; kind?: Kind };
    if (!file && !json) throw new Error("Provide either 'file' or 'json'");

    let value: unknown = null;
    let sourceFile = file;
    if (json) {
      value = JSON.parse(json);
      sourceFile = join(tmpdir(), `pb-schema-doctor-${Date.now()}.json`);
      await writeFile(sourceFile, json, "utf-8");
    } else if (file) {
      try {
        value = JSON.parse(await readFile(file, "utf-8")) as unknown;
      } catch {
        value = null;
      }
    }

    try {
      const inferred = kind ?? inferKind(value ?? {});
      const cmd = validatorCommand(inferred);
      const validation = (await runCliSafe([cmd, sourceFile!])) as {
        valid: boolean;
        diagnostics?: Array<{ path: string; message: string }>;
      };

      const diagnostics = validation.diagnostics ?? [];
      const suggestions = diagnostics.map((d) => ({
        path: d.path,
        suggestion: suggest(d.path, d.message),
      }));
      const scaffold = await scaffoldHint(value ?? {}, inferred);
      return {
        inferredKind: inferred,
        valid: validation.valid,
        diagnostics,
        suggestions,
        scaffoldHint: scaffold,
      };
    } finally {
      if (json && sourceFile) await unlink(sourceFile).catch(() => {});
    }
  },
};
