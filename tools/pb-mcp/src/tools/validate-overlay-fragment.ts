import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const validateOverlayFragment: Tool = {
  def: {
    name: "validate_overlay_fragment",
    description:
      "Validate an overlay section JSON fragment against sectionBlockSchema and return field-level diagnostics.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to overlay section JSON file" },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file } = args as { file: string };
    return runCli(["validate-overlay-fragment", file]);
  },
};
