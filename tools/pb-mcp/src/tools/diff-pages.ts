import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const diffPages: Tool = {
  def: {
    name: "diff_pages",
    description: "Detect breaking and non-breaking changes between two peblor page JSON files.",
    inputSchema: {
      type: "object",
      properties: {
        fileA: { type: "string", description: "Absolute path to the base page JSON file" },
        fileB: { type: "string", description: "Absolute path to the changed page JSON file" },
      },
      required: ["fileA", "fileB"],
    },
  },
  run: async (args) => {
    const { fileA, fileB } = args as { fileA: string; fileB: string };
    return runCli(["diff", fileA, fileB]);
  },
};
