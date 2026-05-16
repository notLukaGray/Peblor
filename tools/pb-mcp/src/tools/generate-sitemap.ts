import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const generateSitemap: Tool = {
  def: {
    name: "generate_sitemap",
    description:
      "Emit a sitemap of all public, non-protected pages with their canonical URLs. Returns XML or JSON.",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["xml", "json"],
          description: "Output format (default: xml)",
        },
        out: {
          type: "string",
          description: "Write sitemap to this file path (optional)",
        },
      },
    },
  },
  run: async (args) => {
    const { format, out } = args as { format?: string; out?: string };
    const cliArgs = ["sitemap"];
    if (format) cliArgs.push("--format", format);
    if (out) cliArgs.push("--out", out);
    return runCli(cliArgs);
  },
};
