import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const validateSection: Tool = {
  def: {
    name: "validate_section",
    description:
      "Validate a section JSON file by dispatching to the section schema for its type and returning structured diagnostics.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to section JSON file" },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file } = args as { file: string };
    return runCli(["validate-section", file]);
  },
};
