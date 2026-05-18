import type { Tool } from "../types.js";
import { scaffoldBgType } from "./scaffold-types.js";

export const scaffoldBgTypeTool: Tool = {
  def: {
    name: "scaffold_bg_type",
    description:
      "Generate a starter JSON object for a background type with required fields pre-filled.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Background type literal" },
      },
      required: ["type"],
    },
  },
  run: async (args) => {
    const { type } = args as { type: string };
    const scaffold = scaffoldBgType(type);
    if (!scaffold) throw new Error(`Unknown background type: ${type}`);
    return { type, scaffold };
  },
};
