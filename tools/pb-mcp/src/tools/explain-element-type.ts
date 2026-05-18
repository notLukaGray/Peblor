import type { Tool } from "../types.js";
import { explainElementTypeSummary } from "./element-types.js";

export const explainElementType: Tool = {
  def: {
    name: "explain_element_type",
    description:
      "Return root-field schema guidance for a single element type literal (e.g. elementHeading, elementButton).",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Element type literal" },
      },
      required: ["type"],
    },
  },
  run: async (args) => {
    const { type } = args as { type: string };
    const detail = explainElementTypeSummary(type);
    if (!detail) throw new Error(`Unknown element type: ${type}`);
    return detail;
  },
};
