import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const probeComponents: Tool = {
  def: {
    name: "probe_components",
    description: "Semantic search over the component catalog by natural language intent.",
    inputSchema: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          description: "What you need (e.g. 'a button that opens a modal')",
        },
        kind: {
          type: "string",
          enum: ["element", "trigger", "motion", "section", "background"],
        },
        top: { type: "number", description: "Max results (default 5)" },
        strict: { type: "boolean", description: "High-confidence matches only" },
        strictKind: {
          type: "boolean",
          description: "Fail if no direct match within the requested --kind",
        },
        verbose: {
          type: "boolean",
          description:
            "Include score and token rationale in results — useful for debugging why a match scored the way it did",
        },
      },
      required: ["intent"],
    },
  },
  run: async (args) => {
    const { intent, kind, top, strict, strictKind, verbose } = args as {
      intent: string;
      kind?: string;
      top?: number;
      strict?: boolean;
      strictKind?: boolean;
      verbose?: boolean;
    };
    const extra: string[] = [];
    if (kind) extra.push("--kind", kind);
    if (top) extra.push("--top", String(top));
    if (strict) extra.push("--strict");
    if (strictKind) extra.push("--strict-kind");
    if (verbose) extra.push("--verbose");
    return runCli(["probe", ...extra, intent]);
  },
};
