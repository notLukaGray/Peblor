import type { Tool } from "../types.js";
import { listModuleTypeSummaries } from "./module-types.js";

export const listModuleTypes: Tool = {
  def: {
    name: "list_module_types",
    description:
      "List module definition IDs and their concrete slot/behavior shapes from content/modules.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => listModuleTypeSummaries(),
};
