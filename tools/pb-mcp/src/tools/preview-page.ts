import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const previewPage: Tool = {
  def: {
    name: "preview_page",
    description:
      "Run a page through the full pipeline (load → validate → expand → resolve) and return the resolved output. Shows exactly what the render engine receives — presets inlined, motion expanded, assets resolved.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to a page JSON file" },
        json: {
          type: "string",
          description: "Inline page JSON to preview without writing to disk",
        },
      },
    },
  },
  run: async (args) => {
    const { file, json } = args as { file?: string; json?: string };
    if (!file && !json) throw new Error("Either 'file' or 'json' must be provided");
    if (json) {
      const tmp = join(tmpdir(), `pb-preview-${Date.now()}.json`);
      await writeFile(tmp, json, "utf-8");
      try {
        return await runCli(["doctor", tmp, "--stage", "resolve"]);
      } finally {
        await unlink(tmp).catch(() => {});
      }
    }
    return runCli(["doctor", file!, "--stage", "resolve"]);
  },
};
