import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const generatePage: Tool = {
  def: {
    name: "generate_page",
    description:
      "Return a rich generation prompt for a new Peblor page. Includes: page-type detection, recommended backgrounds and card presets, a section plan, responsive/motion/theme-token rules, and excerpts from the element/section/preset/motion catalogs. The caller (AI agent) uses this prompt to generate valid page JSON, then writes it via open_page_session + patch_page_session + commit_page_session.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Route path for the new page (e.g. '/about')" },
        intent: {
          type: "string",
          description: "Natural-language description of the page content",
        },
        dryRun: {
          type: "boolean",
          description: "Preview only, do not write (default true)",
        },
      },
      required: ["route"],
    },
  },
  run: async (args) => {
    const { route, intent, dryRun } = args as {
      route: string;
      intent?: string;
      dryRun?: boolean;
    };
    const cliArgs = ["generate", route];
    if (intent) cliArgs.push("--intent", intent);
    if (dryRun !== false) cliArgs.push("--dry-run");
    return runCli(cliArgs);
  },
};
