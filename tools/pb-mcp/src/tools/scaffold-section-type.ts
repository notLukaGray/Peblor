import type { Tool } from "../types.js";
import { scaffoldSectionType } from "./scaffold-types.js";

export const scaffoldSectionTypeTool: Tool = {
  def: {
    name: "scaffold_section_type",
    description:
      "Generate a starter JSON object for a section type with required fields pre-filled.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Section type literal (e.g. contentBlock)" },
      },
      required: ["type"],
    },
  },
  run: async (args) => {
    const { type } = args as { type: string };
    const scaffold = scaffoldSectionType(type);
    if (!scaffold) throw new Error(`Unknown section type: ${type}`);
    return { type, scaffold };
  },
};
