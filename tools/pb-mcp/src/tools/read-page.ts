import type { Tool } from "../types.js";
import { findPage } from "../lib/fs.js";

export const readPage: Tool = {
  def: {
    name: "read_page",
    description:
      "Read a page by route and return its raw JSON. Use before editing to understand current structure.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Route path (e.g. '/work', '/work/project-x')" },
      },
      required: ["route"],
    },
  },
  run: async (args) => {
    const { route } = args as { route: string };
    const { content, path } = await findPage(route);
    return { path, content };
  },
};
