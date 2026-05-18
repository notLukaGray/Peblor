import type { Tool } from "../types.js";

function templateFor(category: string): Record<string, unknown> {
  if (category === "motion") return { type: "motion", initial: {}, animate: {}, transition: {} };
  if (category === "trigger") return { type: "setVariable", payload: { key: "", value: "" } };
  if (category === "section") return { type: "contentBlock", elements: [] };
  if (category === "element") return { type: "elementHeading", text: "", level: 2 };
  if (category === "bg") return { type: "backgroundImage", image: "" };
  return { type: category };
}

export const scaffoldPreset: Tool = {
  def: {
    name: "scaffold_preset",
    description: "Generate a lightweight preset starter object for a given category.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Preset category (motion, trigger, section, element, bg)",
        },
      },
      required: ["category"],
    },
  },
  run: async (args) => {
    const { category } = args as { category: string };
    return { category, scaffold: templateFor(category) };
  },
};
