import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const listProjectGroups: Tool = {
  def: {
    name: "list_project_groups",
    description:
      "Show all projectGroups across all pages with their slugs, element keys, and which pages they appear on.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => runCli(["list-project-groups"]),
};
