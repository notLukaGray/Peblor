import type { Tool } from "../types.js";
import { listPages } from "../lib/fs.js";

export const listPagesTool: Tool = {
  def: {
    name: "list_pages",
    description: "List all pages in the project with their routes and file paths.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => listPages(),
};
