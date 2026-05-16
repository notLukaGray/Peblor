import type { Tool } from "../types.js";
import { readContentFile } from "../lib/fs.js";
import { MODALS_DIR } from "../lib/paths.js";

export const readModal: Tool = {
  def: {
    name: "read_modal",
    description: "Read a modal definition by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Modal ID without extension" },
      },
      required: ["id"],
    },
  },
  run: async (args) => {
    const { id } = args as { id: string };
    return readContentFile(MODALS_DIR, id);
  },
};
