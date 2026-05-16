import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const renameRoute: Tool = {
  def: {
    name: "rename_route",
    description:
      "Move a page from one route to another. Updates slug and canonicalUrl metadata. Warns about other pages that reference the old route via href.",
    inputSchema: {
      type: "object",
      properties: {
        oldRoute: { type: "string", description: "Current route (e.g. '/about')" },
        newRoute: { type: "string", description: "New route (e.g. '/about-us')" },
      },
      required: ["oldRoute", "newRoute"],
    },
  },
  run: async (args) => {
    const { oldRoute, newRoute } = args as { oldRoute: string; newRoute: string };
    return runCli(["rename-route", oldRoute, newRoute]);
  },
};
