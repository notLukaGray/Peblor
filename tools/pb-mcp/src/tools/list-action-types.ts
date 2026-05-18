import type { Tool } from "../types.js";
import { listActionTypeSummaries } from "./action-schema.js";

export const listActionTypes: Tool = {
  def: {
    name: "list_action_types",
    description:
      "List all trigger action type literals and summarize each payload shape from triggerActionSchema.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => listActionTypeSummaries(),
};
