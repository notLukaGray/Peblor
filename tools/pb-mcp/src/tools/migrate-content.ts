import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const migrateContent: Tool = {
  def: {
    name: "migrate_content",
    description: "Auto-migrate a peblor page JSON file from one schema version to another.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to the page JSON file" },
        from: { type: "string", description: "Source schema version" },
        to: { type: "string", description: "Target schema version" },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file, from, to } = args as { file: string; from?: string; to?: string };
    const extra: string[] = [];
    if (from) extra.push("--from", from);
    if (to) extra.push("--to", to);
    return runCli(["migrate", file, ...extra]);
  },
};
