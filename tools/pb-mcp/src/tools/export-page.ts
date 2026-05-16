import fs from "node:fs";
import type { Tool } from "../types.js";
import { findPage } from "../lib/fs.js";

const INTERNAL_FIELDS = new Set(["figmaExportDiagnostics", "_pb_internal", "__pb"]);

function stripInternalFields(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripInternalFields);
  if (obj == null || typeof obj !== "object") return obj;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (!INTERNAL_FIELDS.has(key)) {
      out[key] = stripInternalFields(value);
    }
  }
  return out;
}

export const exportPage: Tool = {
  def: {
    name: "export_page",
    description:
      "Export a page through a registered format. Currently supports 'clean-json' (strips internal/diagnostic fields).",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route to export (e.g. '/about')" },
        format: {
          type: "string",
          enum: ["clean-json"],
          description: "Export format (currently only clean-json is supported)",
        },
        out: { type: "string", description: "Write output to this file path (optional)" },
      },
      required: ["route", "format"],
    },
  },
  run: async (args) => {
    const { route, format, out } = args as {
      route: string;
      format: string;
      out?: string;
    };

    if (format !== "clean-json") {
      throw new Error(
        `Unsupported export format: ${format}. Only 'clean-json' is currently supported.`
      );
    }

    const { content } = await findPage(route);
    const cleaned = stripInternalFields(content);

    if (out) {
      fs.writeFileSync(out, `${JSON.stringify(cleaned, null, 2)}\n`, "utf-8");
      return { status: "ok", route, format, file: out };
    }

    return { status: "ok", route, format, content: cleaned };
  },
};
