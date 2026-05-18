import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const validateElement: Tool = {
  def: {
    name: "validate_element",
    description:
      "Validate an element JSON file against elementBlockSchema and return field-level diagnostics.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to element JSON file" },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file } = args as { file: string };
    return runCli(["validate-element", file]);
  },
};
