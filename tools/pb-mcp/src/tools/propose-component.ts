import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const proposeComponent: Tool = {
  def: {
    name: "propose_component",
    description:
      "Create a new component proposal file for a component that doesn't exist in the catalog.",
    inputSchema: {
      type: "object",
      properties: {
        intent: { type: "string", description: "Natural language description of the component" },
        kind: {
          type: "string",
          enum: ["element", "trigger", "motion", "section", "background"],
        },
        extend: { type: "string", description: "Extend an existing cluster ID" },
      },
      required: ["intent"],
    },
  },
  run: async (args) => {
    const { intent, kind, extend } = args as {
      intent: string;
      kind?: string;
      extend?: string;
    };
    const extra = extend
      ? ["--extend", extend]
      : ["--intent", intent, ...(kind ? ["--kind", kind] : [])];
    return runCli(["propose", "new", ...extra]);
  },
};
