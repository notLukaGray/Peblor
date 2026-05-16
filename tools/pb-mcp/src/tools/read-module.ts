import type { Tool } from "../types.js";
import { readContentFile } from "../lib/fs.js";
import { MODULES_DIR } from "../lib/paths.js";

export const readModule: Tool = {
  def: {
    name: "read_module",
    description: "Read a module definition by ID (e.g. 'video-player', 'audio-player').",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module ID without extension" },
      },
      required: ["id"],
    },
  },
  run: async (args) => {
    const { id } = args as { id: string };
    return readContentFile(MODULES_DIR, id);
  },
};
