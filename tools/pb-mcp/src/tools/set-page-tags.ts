import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const setPageTags: Tool = {
  def: {
    name: "set_page_tags",
    description:
      "Set or merge taxonomy tags on a page. Use merge: true to append rather than replace existing tags.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route (e.g. '/about')" },
        tags: {
          type: "object",
          description: 'Tags to set. Record of category → value list. E.g. {"brand":["alpha"]}',
          additionalProperties: { type: "array", items: { type: "string" } },
        },
        merge: {
          type: "boolean",
          description: "Merge with existing tags instead of replacing (default: replace)",
        },
        write: { type: "boolean", description: "Write changes to disk (default: dry-run)" },
      },
      required: ["route", "tags"],
    },
  },
  run: async (args) => {
    const { route, tags, merge, write } = args as {
      route: string;
      tags: Record<string, string[]>;
      merge?: boolean;
      write?: boolean;
    };
    const cliArgs = ["set-page-tags", route, "--tags", JSON.stringify(tags)];
    if (merge) cliArgs.push("--merge");
    if (write) cliArgs.push("--write");
    return runCli(cliArgs);
  },
};
