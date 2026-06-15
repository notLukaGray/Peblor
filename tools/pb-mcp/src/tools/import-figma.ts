import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const importFigma: Tool = {
  def: {
    name: "import_figma",
    description:
      "Import a Figma exporter payload (wrapper/export-result/section-artifact or single page) and normalize it into content/pages, content/presets, content/modals, and content/modules. Validates before writing.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "object",
          description: "Parsed JSON payload from Figma exporter",
        },
        write: {
          type: "boolean",
          description: "Write imported files to disk (default: dry-run)",
        },
        force: {
          type: "boolean",
          description: "Overwrite existing files when writing",
        },
      },
      required: ["content"],
    },
  },
  run: async (args) => {
    const { content, write, force } = args as {
      content: Record<string, unknown>;
      write?: boolean;
      force?: boolean;
    };
    const cliArgs = ["import-figma", "--inline", JSON.stringify(content)];
    if (write) cliArgs.push("--write");
    if (force) cliArgs.push("--force");
    return runCli(cliArgs);
  },
};
