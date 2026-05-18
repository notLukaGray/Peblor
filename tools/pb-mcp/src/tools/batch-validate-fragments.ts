import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const batchValidateFragments: Tool = {
  def: {
    name: "batch_validate_fragments",
    description:
      "Validate all JSON fragments in a directory for a given kind (section, element, action, bg, module, overlay, fragment).",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Absolute directory path to scan recursively" },
        kind: {
          type: "string",
          enum: ["section", "element", "action", "bg", "module", "overlay", "fragment"],
          description: "Fragment kind schema to validate against",
        },
      },
      required: ["dir", "kind"],
    },
  },
  run: async (args) => {
    const { dir, kind } = args as { dir: string; kind: string };
    return runCli(["validate-fragments", dir, "--kind", kind]);
  },
};
