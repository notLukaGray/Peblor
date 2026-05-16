import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const grepPages: Tool = {
  def: {
    name: "grep_pages",
    description:
      "Search across all pages for blocks matching a type, field, field value, or preset reference. Returns matches grouped by route with JSON paths. Essential for understanding site-wide usage before making changes.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            "Match blocks by their 'type' field (e.g. 'elementHeading', 'contentBlock', 'backgroundVideo')",
        },
        field: {
          type: "string",
          description: "Match blocks that have this field present (e.g. 'ariaLabel', 'visibility')",
        },
        value: {
          type: "string",
          description: "Match blocks where 'field' equals this value (requires field)",
        },
        preset: {
          type: "string",
          description: "Match blocks that reference this preset ID in their preset/presets field",
        },
      },
    },
  },
  run: async (args) => {
    const { type, field, value, preset } = args as {
      type?: string;
      field?: string;
      value?: string;
      preset?: string;
    };
    if (!type && !field && !preset) {
      throw new Error("At least one of type, field, or preset is required");
    }
    const extra: string[] = [];
    if (type) extra.push("--type", type);
    if (field) extra.push("--field", field);
    if (value) extra.push("--value", value);
    if (preset) extra.push("--preset", preset);
    return runCli(["grep", ...extra, "--json"]);
  },
};
