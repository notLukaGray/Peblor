import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const explainComponent: Tool = {
  def: {
    name: "explain_component",
    description:
      "Show documentation for a component by cluster ID. For field schemas needed to generate JSON, use get_element_schema.",
    inputSchema: {
      type: "object",
      properties: {
        clusterId: {
          type: "string",
          description: "e.g. 'element.heading', 'section.contentBlock'",
        },
        fields: { type: "boolean" },
        examples: { type: "boolean" },
      },
      required: ["clusterId"],
    },
  },
  run: async (args) => {
    const { clusterId, fields, examples } = args as {
      clusterId: string;
      fields?: boolean;
      examples?: boolean;
    };
    const extra: string[] = [];
    if (fields) extra.push("--fields");
    if (examples) extra.push("--examples");
    return runCli(["explain", clusterId, ...extra]);
  },
};
