import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const validateModuleFragment: Tool = {
  def: {
    name: "validate_module_fragment",
    description:
      "Validate a module JSON fragment against moduleBlockSchema and return field-level diagnostics.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to module JSON file" },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file } = args as { file: string };
    return runCli(["validate-module-fragment", file]);
  },
};
