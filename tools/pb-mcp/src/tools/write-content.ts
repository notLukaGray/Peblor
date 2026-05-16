import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const writeModal: Tool = {
  def: {
    name: "write_modal",
    description:
      "Validate a modal definition against modalBuilderSchema and write it to content/modals/<id>.json. Nothing is written if validation fails — diagnostics are returned instead.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Modal ID (becomes the filename without .json)" },
        content: {
          type: "object",
          description: "Full modal definition JSON (must conform to modalBuilderSchema)",
        },
        force: { type: "boolean", description: "Overwrite if the file already exists" },
      },
      required: ["id", "content"],
    },
  },
  run: async (args) => {
    const { id, content, force } = args as {
      id: string;
      content: Record<string, unknown>;
      force?: boolean;
    };
    const extra = force ? ["--force"] : [];
    return runCli(["write-modal", id, "--inline", JSON.stringify(content), ...extra, "--json"]);
  },
};

export const writeModule: Tool = {
  def: {
    name: "write_module",
    description:
      "Validate a module definition against moduleBlockSchema and write it to content/modules/<id>.json. Nothing is written if validation fails — diagnostics are returned instead.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module ID (becomes the filename without .json)" },
        content: {
          type: "object",
          description: "Full module definition JSON (must conform to moduleBlockSchema)",
        },
        force: { type: "boolean", description: "Overwrite if the file already exists" },
      },
      required: ["id", "content"],
    },
  },
  run: async (args) => {
    const { id, content, force } = args as {
      id: string;
      content: Record<string, unknown>;
      force?: boolean;
    };
    const extra = force ? ["--force"] : [];
    return runCli(["write-module", id, "--inline", JSON.stringify(content), ...extra, "--json"]);
  },
};
