import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const batchEditPages: Tool = {
  def: {
    name: "batch_edit_pages",
    description:
      "Apply an RFC 7396 merge patch to all pages matching a grep filter. Default is dry-run — set write: true to persist. Validates each patch before any write.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "object",
          description: "Filter to select pages",
          properties: {
            type: { type: "string", description: "Match blocks with this type" },
            field: { type: "string", description: "Match blocks that have this field" },
            value: { type: "string", description: "Match blocks where field equals this value" },
          },
        },
        patch: {
          type: "object",
          description: "RFC 7396 merge patch to apply to matched pages",
        },
        write: {
          type: "boolean",
          description: "Persist changes to disk (default: dry-run)",
        },
        dryRun: {
          type: "boolean",
          description: "Preview only, do not write",
        },
      },
      required: ["patch"],
    },
  },
  run: async (args) => {
    const { filter, patch, write, dryRun } = args as {
      filter?: { type?: string; field?: string; value?: string };
      patch: Record<string, unknown>;
      write?: boolean;
      dryRun?: boolean;
    };
    const cliArgs = ["batch-edit", "--patch", JSON.stringify(patch)];
    if (filter?.type) cliArgs.push("--type", filter.type);
    if (filter?.field) cliArgs.push("--field", filter.field);
    if (filter?.value) cliArgs.push("--value", filter.value);
    if (write) cliArgs.push("--write");
    if (dryRun) cliArgs.push("--dry-run");
    return runCli(cliArgs);
  },
};
