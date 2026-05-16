import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const listCapabilities: Tool = {
  def: {
    name: "list_capabilities",
    description:
      "List all registered importer/exporter/CMS adapter capability declarations (*.capability.json) found in the project.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["importer", "exporter", "cmsAdapter"],
          description: "Filter by capability type",
        },
      },
    },
  },
  run: async (args) => {
    const { type } = args as { type?: string };
    const cliArgs = ["list-capabilities"];
    if (type) cliArgs.push("--type", type);
    return runCli(cliArgs);
  },
};
