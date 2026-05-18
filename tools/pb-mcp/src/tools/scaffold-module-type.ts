import type { Tool } from "../types.js";
import { scaffoldModuleType } from "./scaffold-types.js";

export const scaffoldModuleTypeTool: Tool = {
  def: {
    name: "scaffold_module_type",
    description:
      "Generate a starter JSON object for a module ID by cloning its existing definition from content/modules.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module definition ID" },
      },
      required: ["id"],
    },
  },
  run: async (args) => {
    const { id } = args as { id: string };
    const scaffold = await scaffoldModuleType(id);
    if (!scaffold) throw new Error(`Unknown module type: ${id}`);
    return { id, scaffold };
  },
};
