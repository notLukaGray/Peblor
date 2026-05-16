import type { Tool } from "../types.js";
import { listPresets } from "../lib/fs.js";

export const searchPresets: Tool = {
  def: {
    name: "search_presets",
    description:
      "Text search over preset names. Returns presets whose ID contains the query string.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search string to match against preset IDs" },
      },
      required: ["query"],
    },
  },
  run: async (args) => {
    const { query } = args as { query: string };
    const all = await listPresets();
    const lower = query.toLowerCase();
    return all
      .map(({ category, presets }) => ({
        category,
        presets: presets.filter((id) => id.toLowerCase().includes(lower)),
      }))
      .filter(({ presets }) => presets.length > 0);
  },
};
