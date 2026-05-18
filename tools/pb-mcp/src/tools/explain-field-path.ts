import type { Tool } from "../types.js";
import { getElementSchema } from "./get-element-schema.js";

export const explainFieldPath: Tool = {
  def: {
    name: "explain_field_path",
    description:
      "Explain a specific field path for a cluster schema by returning the node details at that path.",
    inputSchema: {
      type: "object",
      properties: {
        clusterId: { type: "string", description: "Catalog cluster ID (e.g. element.heading)" },
        path: { type: "string", description: "Dot path under fields (e.g. motion.whileHover)" },
      },
      required: ["clusterId", "path"],
    },
  },
  run: async (args) => {
    const { clusterId, path } = args as { clusterId: string; path: string };
    const schema = (await getElementSchema.run({ clusterId })) as {
      fields?: Record<string, unknown>;
    };
    const parts = path.split(".").filter(Boolean);
    let cursor: unknown = schema.fields;
    for (const part of parts) {
      if (!cursor || typeof cursor !== "object") {
        throw new Error(`Path not found: ${path}`);
      }
      const obj = cursor as Record<string, unknown>;
      const next = obj[part] ?? (obj.fields as Record<string, unknown> | undefined)?.[part];
      if (next === undefined) throw new Error(`Path not found: ${path}`);
      cursor = next;
    }
    return { clusterId, path, node: cursor };
  },
};
