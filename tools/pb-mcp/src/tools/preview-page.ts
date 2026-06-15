import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const previewPage: Tool = {
  def: {
    name: "preview_page",
    description: [
      "Run a page through the pipeline up to the resolve stage and return the resolved output.",
      "For pages inside content/pages/, uses the route-aware strict loader (same path as the app: presets, global modules, sidecar section hydration, cross-ref validation).",
      "For inline JSON or files outside the content tree, falls back to schema-only loading.",
      "Note: this does NOT include builder defaults, entrance motion expansion, overlay loading, or app-layer filter logic — those happen later in the render chain.",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          description: "Absolute path to a page index.json inside content/pages/",
        },
        json: {
          type: "string",
          description:
            "Inline page JSON to preview. Validated schema-only (no route context, no global preset/module loading).",
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
        await unlink(tmp).catch((err) =>
          console.warn("[pb-mcp] Failed to clean up temp file", tmp, err)
        );
      }
    }
    // For files on disk: doctor will use route-aware loading if the file is under content/pages/.
    return runCli(["doctor", file!, "--stage", "resolve"]);
  },
};
