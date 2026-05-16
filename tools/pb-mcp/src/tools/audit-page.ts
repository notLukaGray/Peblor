import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const auditPage: Tool = {
  def: {
    name: "audit_page",
    description:
      "Soft audit beyond schema validation: detects orphaned definitions, broken internal links, permanently invisible sections, and disabled overlays.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route to audit (e.g. '/about')" },
      },
      required: ["route"],
    },
  },
  run: async (args) => {
    const { route } = args as { route: string };
    return runCli(["audit", route]);
  },
};

export const auditAllPages: Tool = {
  def: {
    name: "audit_all_pages",
    description:
      "Run the soft audit across all pages. Returns issue summaries for every page that has problems.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  run: async () => runCli(["audit", "--all"]),
};
