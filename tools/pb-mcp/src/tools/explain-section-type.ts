import type { Tool } from "../types.js";
import { explainSectionTypeSummary } from "./section-types.js";

export const explainSectionType: Tool = {
  def: {
    name: "explain_section_type",
    description:
      "Return root-field schema guidance for a single section type literal (e.g. contentBlock, sectionColumn).",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Section type literal" },
      },
      required: ["type"],
    },
  },
  run: async (args) => {
    const { type } = args as { type: string };
    const detail = explainSectionTypeSummary(type);
    if (!detail) throw new Error(`Unknown section type: ${type}`);
    return detail;
  },
};
