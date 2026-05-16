import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const clonePage: Tool = {
  def: {
    name: "clone_page",
    description:
      "Deep-copy a page to a new route, rewriting title, slug, and canonicalUrl. Validates before writing.",
    inputSchema: {
      type: "object",
      properties: {
        sourceRoute: { type: "string", description: "Source route to clone from (e.g. '/about')" },
        destRoute: { type: "string", description: "Destination route (e.g. '/about-v2')" },
        title: { type: "string", description: "Override title for the cloned page" },
        force: { type: "boolean", description: "Overwrite if destination already exists" },
      },
      required: ["sourceRoute", "destRoute"],
    },
  },
  run: async (args) => {
    const { sourceRoute, destRoute, title, force } = args as {
      sourceRoute: string;
      destRoute: string;
      title?: string;
      force?: boolean;
    };
    const cliArgs = ["clone", sourceRoute, destRoute];
    if (title) cliArgs.push("--title", title);
    if (force) cliArgs.push("--force");
    return runCli(cliArgs);
  },
};
