import type { Tool } from "../types.js";
import { findPreset } from "../lib/fs.js";

export const readPreset: Tool = {
  def: {
    name: "read_preset",
    description:
      "Read a preset by ID to inspect its full JSON structure. Use before composing with a preset.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Preset ID without extension (e.g. 'primary-button', 'motion-fade')",
        },
      },
      required: ["id"],
    },
  },
  run: async (args) => {
    const { id } = args as { id: string };
    return findPreset(id);
  },
};
