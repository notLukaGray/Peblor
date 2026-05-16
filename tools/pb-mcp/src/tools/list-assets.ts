import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const listAssets: Tool = {
  def: {
    name: "list_assets",
    description:
      "List all asset refs (images, videos, vectors) across all pages or a single page, grouped by type.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Limit to a single page route (optional)" },
        type: {
          type: "string",
          enum: ["image", "video", "vector"],
          description: "Filter by asset type",
        },
      },
    },
  },
  run: async (args) => {
    const { route, type } = args as { route?: string; type?: string };
    const cliArgs = ["list-assets"];
    if (route) cliArgs.push(route);
    if (type) cliArgs.push("--type", type);
    return runCli(cliArgs);
  },
};
