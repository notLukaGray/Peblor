import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const generatePage: Tool = {
  def: {
    name: "generate_page",
    description:
      "Return a scaffold + schema hints + a structured prompt for generating a new page. The caller (AI agent) fills in the scaffold using the prompt and then writes it via scaffold_page or edit_page.",
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
