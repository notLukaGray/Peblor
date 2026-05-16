import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const validateCapability: Tool = {
  def: {
    name: "validate_capability",
    description:
      "Validate a capability declaration file against the capability schemas (importer, exporter, or cmsAdapter).",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to the capability file" },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file } = args as { file: string };
    return runCli(["validate-capability", file]);
  },
};
