import type { Tool } from "../types.js";
import { scaffoldElementType } from "./scaffold-types.js";

export const scaffoldElementTypeTool: Tool = {
  def: {
    name: "scaffold_element_type",
    description:
      "Generate a starter JSON object for an element type with required fields pre-filled.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Element type literal (e.g. elementHeading)" },
      },
      required: ["type"],
    },
  },
  run: async (args) => {
    const { type } = args as { type: string };
    const scaffold = scaffoldElementType(type);
    if (!scaffold) throw new Error(`Unknown element type: ${type}`);
    return { type, scaffold };
  },
};
