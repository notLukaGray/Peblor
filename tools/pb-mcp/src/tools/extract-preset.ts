import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const extractPreset: Tool = {
  def: {
    name: "extract_preset",
    description:
      "Pull a definition block out of a page into a named preset file, replacing the inline definition with a preset reference.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route containing the definition" },
        defKey: { type: "string", description: "Definition key to extract" },
        presetId: { type: "string", description: "ID for the new preset file" },
        write: { type: "boolean", description: "Write changes to disk (default: dry-run)" },
      },
      required: ["route", "defKey", "presetId"],
    },
  },
  run: async (args) => {
    const { route, defKey, presetId, write } = args as {
      route: string;
      defKey: string;
      presetId: string;
      write?: boolean;
    };
    const cliArgs = ["extract-preset", route, "--key", defKey, "--preset-id", presetId];
    if (write) cliArgs.push("--write");
    return runCli(cliArgs);
  },
};
