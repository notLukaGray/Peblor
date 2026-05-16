import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const getElementSchema: Tool = {
  def: {
    name: "get_element_schema",
    description:
      "Return the full field schema + examples for a component. Use this to generate valid JSON — shows every required/optional field, types, and enum values.",
    inputSchema: {
      type: "object",
      properties: {
        clusterId: {
          type: "string",
          description: "e.g. 'element.heading', 'section.contentBlock', 'trigger.assetTogglePlay'",
        },
      },
      required: ["clusterId"],
    },
  },
  run: async (args) => {
    const { clusterId } = args as { clusterId: string };
    return runCli(["explain", clusterId, "--fields", "--examples"]);
  },
};
