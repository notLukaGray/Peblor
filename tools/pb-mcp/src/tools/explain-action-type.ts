import type { Tool } from "../types.js";
import { explainActionTypeSummary } from "./action-schema.js";

export const explainActionType: Tool = {
  def: {
    name: "explain_action_type",
    description:
      "Return payload schema details for a single trigger action type literal (e.g. setVariable, navigate).",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Trigger action type literal" },
      },
      required: ["type"],
    },
  },
  run: async (args) => {
    const { type } = args as { type: string };
    const detail = explainActionTypeSummary(type);
    if (!detail) throw new Error(`Unknown action type: ${type}`);
    return detail;
  },
};
