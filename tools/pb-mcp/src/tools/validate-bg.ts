import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const validateBg: Tool = {
  def: {
    name: "validate_bg",
    description:
      "Validate a background JSON file against bgBlockSchema and return field-level diagnostics.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to background JSON file" },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file } = args as { file: string };
    return runCli(["validate-bg", file]);
  },
};
