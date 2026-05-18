import type { Tool } from "../types.js";
import { listSectionTypeSummaries } from "./section-types.js";

export const listSectionTypes: Tool = {
  def: {
    name: "list_section_types",
    description:
      "List valid section type literals with root-level fields, restrictions, and element structure conventions.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => listSectionTypeSummaries(),
};
