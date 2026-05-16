import type { Tool } from "../types.js";
import { listPresets } from "../lib/fs.js";

export const listPresetsTool: Tool = {
  def: {
    name: "list_presets",
    description:
      "List all presets grouped by category (motion, trigger, element, section, bg, etc.). Discover what's available before composing a page.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter to a specific category" },
      },
    },
  },
  run: async (args) => {
    const { category } = args as { category?: string };
    const all = await listPresets();
    return category ? all.filter((c) => c.category === category) : all;
  },
};
