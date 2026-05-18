import type { Tool } from "../types.js";
import { listElementTypeSummaries } from "./element-types.js";

export const listElementTypes: Tool = {
  def: {
    name: "list_element_types",
    description:
      "List valid element type literals with root-level fields and structural guidance (including motion nesting).",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => listElementTypeSummaries(),
};
