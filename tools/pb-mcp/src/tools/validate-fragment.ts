import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const validateFragment: Tool = {
  def: {
    name: "validate_fragment",
    description:
      "Validate a generic JSON fragment by inferring its schema kind (motion, action, element, section, bg, module).",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to fragment JSON file" },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file } = args as { file: string };
    return runCli(["validate-fragment", file]);
  },
};
