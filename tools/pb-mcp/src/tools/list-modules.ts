import type { Tool } from "../types.js";
import { listContentDir } from "../lib/fs.js";
import { MODULES_DIR } from "../lib/paths.js";

export const listModules: Tool = {
  def: {
    name: "list_modules",
    description:
      "List all module definitions available in the project (e.g. audio-player, video-player variants).",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => listContentDir(MODULES_DIR),
};
