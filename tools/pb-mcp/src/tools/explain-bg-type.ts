import type { Tool } from "../types.js";
import { explainBgTypeSummary } from "./bg-types.js";

export const explainBgType: Tool = {
  def: {
    name: "explain_bg_type",
    description:
      "Return root-field schema guidance for a single background type literal (e.g. backgroundImage, backgroundTransition).",
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
    const detail = explainBgTypeSummary(type);
    if (!detail) throw new Error(`Unknown background type: ${type}`);
    return detail;
  },
};
