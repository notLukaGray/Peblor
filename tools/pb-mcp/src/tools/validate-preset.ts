import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const validatePreset: Tool = {
  def: {
    name: "validate_preset",
    description:
      "Validate a preset JSON file by inferring its schema kind (motion, action, element, section, bg, module).",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to preset JSON file" },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file } = args as { file: string };
    return runCli(["validate-preset", file]);
  },
};
