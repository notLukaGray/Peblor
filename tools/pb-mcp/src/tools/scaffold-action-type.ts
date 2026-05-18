import type { Tool } from "../types.js";
import { scaffoldActionType } from "./scaffold-types.js";

export const scaffoldActionTypeTool: Tool = {
  def: {
    name: "scaffold_action_type",
    description:
      "Generate a starter JSON object for a trigger action type with required fields pre-filled.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Trigger action type literal (e.g. setVariable)" },
      },
      required: ["type"],
    },
  },
  run: async (args) => {
    const { type } = args as { type: string };
    const scaffold = scaffoldActionType(type);
    if (!scaffold) throw new Error(`Unknown action type: ${type}`);
    return { type, scaffold };
  },
};
