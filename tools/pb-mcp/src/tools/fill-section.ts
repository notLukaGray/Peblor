import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const fillSection: Tool = {
  def: {
    name: "fill_section",
    description:
      "Return the current section JSON + schema hints + a prompt for filling in a section's content. The caller (AI agent) fills in the content and then writes it back via edit_page.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route (e.g. '/about')" },
        key: { type: "string", description: "Section definition key to fill" },
        intent: {
          type: "string",
          description: "Natural-language description of the desired section content",
        },
      },
      required: ["route", "key"],
    },
  },
  run: async (args) => {
    const { route, key, intent } = args as {
      route: string;
      key: string;
      intent?: string;
    };
    const cliArgs = ["fill-section", route, "--key", key];
    if (intent) cliArgs.push("--intent", intent);
    return runCli(cliArgs);
  },
};
