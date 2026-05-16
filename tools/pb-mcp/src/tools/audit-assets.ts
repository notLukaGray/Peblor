import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const auditAssets: Tool = {
  def: {
    name: "audit_assets",
    description:
      "For a page (or all pages), verify each asset ref resolves to a CDN URL. Reports broken asset refs.",
    inputSchema: {
      type: "object",
      properties: {
        route: {
          type: "string",
          description: "Limit audit to a single page route (omit for all pages)",
        },
      },
    },
  },
  run: async (args) => {
    const { route } = args as { route?: string };
    const cliArgs = ["audit-assets"];
    if (route) cliArgs.push(route);
    return runCli(cliArgs);
  },
};
