import type { Tool } from "../types.js";
import { validateActionValue } from "./action-schema.js";

export const validateAction: Tool = {
  def: {
    name: "validate_action",
    description:
      "Validate a trigger action object against triggerActionSchema and return field-level diagnostics.",
    inputSchema: {
      type: "object",
      properties: {
        json: {
          type: "string",
          description: "Inline action JSON string to validate",
        },
        action: {
          type: "object",
          description: "Action object to validate",
        },
      },
    },
  },
  run: async (args) => {
    const { json, action } = args as { json?: string; action?: Record<string, unknown> };
    if (!json && !action) throw new Error("Either 'json' or 'action' must be provided");
    const value = json ? (JSON.parse(json) as unknown) : action;
    const validated = validateActionValue(value);
    return {
      valid: validated.valid,
      diagnostics: validated.diagnostics,
    };
  },
};
