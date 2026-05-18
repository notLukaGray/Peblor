import type { Tool } from "../types.js";
import { explainModuleTypeSummary } from "./module-types.js";

export const explainModuleType: Tool = {
  def: {
    name: "explain_module_type",
    description:
      "Return schema root-fields plus concrete module definition details for one module ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module definition ID from content/modules" },
      },
      required: ["id"],
    },
  },
  run: async (args) => {
    const { id } = args as { id: string };
    const detail = await explainModuleTypeSummary(id);
    if (!detail) throw new Error(`Unknown module type: ${id}`);
    return detail;
  },
};
