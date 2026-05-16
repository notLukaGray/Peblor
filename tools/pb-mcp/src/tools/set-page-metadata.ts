import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const setPageMetadata: Tool = {
  def: {
    name: "set_page_metadata",
    description:
      "Shorthand to update top-level metadata fields on a page without a raw merge patch. Fields: title, description, ogImage, canonicalUrl, robots, keywords, lang, visibility, passwordProtected, forcedTheme, density.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route (e.g. '/about')" },
        fields: {
          type: "object",
          description: "Metadata fields to set",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            ogImage: { type: "string" },
            canonicalUrl: { type: "string" },
            robots: { type: "string" },
            keywords: { type: "string" },
            lang: { type: "string" },
            visibility: { type: "string", enum: ["public", "protected", "unlisted"] },
            passwordProtected: { type: "boolean" },
            forcedTheme: { type: "string", enum: ["light", "dark"] },
            density: { type: "number" },
          },
        },
        write: { type: "boolean", description: "Write changes to disk (default: dry-run)" },
      },
      required: ["route", "fields"],
    },
  },
  run: async (args) => {
    const { route, fields, write } = args as {
      route: string;
      fields: Record<string, string | boolean | number>;
      write?: boolean;
    };
    const cliArgs = ["set-metadata", route];
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        cliArgs.push(`--${key}`, String(value));
      }
    }
    if (write) cliArgs.push("--write");
    return runCli(cliArgs);
  },
};
