import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const listComponents: Tool = {
  def: {
    name: "list_components",
    description:
      "List all peblor components in the catalog, optionally filtered by kind. Also available as peblor://components/{kind} resource.",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["element", "trigger", "motion", "section", "background"],
        },
      },
    },
  },
  run: async (args) => {
    const { kind } = args as { kind?: string };
    const extra = kind ? ["--kind", kind] : [];
    return runCli(["explain", "--all", ...extra]);
  },
};
