import type { Tool } from "../types.js";
import { listBgTypeSummaries } from "./bg-types.js";

export const listBgTypes: Tool = {
  def: {
    name: "list_bg_types",
    description:
      "List valid background type literals with root-level field names and field type hints.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => listBgTypeSummaries(),
};
