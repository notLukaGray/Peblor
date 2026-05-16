import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const listTags: Tool = {
  def: {
    name: "list_tags",
    description:
      "Aggregate all taxonomy tags across all pages and show which pages carry each tag, grouped by category.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Filter to a specific tag category (optional)",
        },
      },
    },
  },
  run: async (args) => {
    const { category } = args as { category?: string };
    const cliArgs = ["list-tags"];
    if (category) cliArgs.push("--category", category);
    return runCli(cliArgs);
  },
};
