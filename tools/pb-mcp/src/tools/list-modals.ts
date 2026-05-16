import type { Tool } from "../types.js";
import { listContentDir } from "../lib/fs.js";
import { MODALS_DIR } from "../lib/paths.js";

export const listModals: Tool = {
  def: {
    name: "list_modals",
    description: "List all modal definitions available in the project.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => listContentDir(MODALS_DIR),
};
