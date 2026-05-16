import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const listUnusedPresets: Tool = {
  def: {
    name: "list_unused_presets",
    description:
      "Report presets (in content/presets) that are not referenced by any page. Helps identify dead preset files.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => runCli(["list-unused-presets"]),
};
