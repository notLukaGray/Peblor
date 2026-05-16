import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const lintPage: Tool = {
  def: {
    name: "lint_page",
    description:
      "Style and quality warnings for a page: empty text fields, images without alt text, empty sections, unintentional forcedTheme, etc.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route to lint (e.g. '/about')" },
      },
      required: ["route"],
    },
  },
  run: async (args) => {
    const { route } = args as { route: string };
    return runCli(["lint", route]);
  },
};

export const lintAllPages: Tool = {
  def: {
    name: "lint_all_pages",
    description: "Run lint checks across all pages. Returns quality warnings for every page.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => runCli(["lint", "--all"]),
};
