import type { Tool } from "../types.js";
import { getElementSchema } from "./get-element-schema.js";

function collectPaths(node: unknown, base: string, out: string[]): void {
  if (!node || typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  if (base) out.push(base);
  const fields = rec.fields;
  if (!fields || typeof fields !== "object") return;
  for (const key of Object.keys(fields as Record<string, unknown>).sort((a, b) =>
    a.localeCompare(b)
  )) {
    const next = base ? `${base}.${key}` : key;
    collectPaths((fields as Record<string, unknown>)[key], next, out);
  }
}

export const listFieldPaths: Tool = {
  def: {
    name: "list_field_paths",
    description:
      "List all nested field paths for a cluster schema (useful for prompts/autocomplete).",
    inputSchema: {
      type: "object",
      properties: {
        clusterId: { type: "string", description: "Catalog cluster ID (e.g. element.heading)" },
      },
      required: ["clusterId"],
    },
  },
  run: async (args) => {
    const { clusterId } = args as { clusterId: string };
    const schema = (await getElementSchema.run({ clusterId })) as {
      keyFields?: Record<string, unknown>;
      fields?: Record<string, unknown>;
    };
    // Support both the new keyFields shape and the legacy fields shape
    const fieldMap = schema.keyFields ?? schema.fields ?? {};
    const paths: string[] = [];
    for (const key of Object.keys(fieldMap).sort((a, b) => a.localeCompare(b))) {
      collectPaths(fieldMap[key], key, paths);
    }
    return { clusterId, count: paths.length, paths };
  },
};
