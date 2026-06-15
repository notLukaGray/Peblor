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
      keyFields?: Record<string, unknown>;
      fields?: Record<string, unknown>;
    };
    // Support both the new keyFields shape and the legacy fields shape
    const fieldMap = schema.keyFields ?? schema.fields ?? {};
    const parts = path.split(".").filter(Boolean);
    // First try: direct top-level lookup in fieldMap (handles the common "motion" case)
    if (parts.length === 1 && parts[0] !== undefined && fieldMap[parts[0]] !== undefined) {
      return { clusterId, path, node: fieldMap[parts[0]] };
    }
    // Fallback: walk nested structure
    let cursor: unknown = fieldMap;
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
