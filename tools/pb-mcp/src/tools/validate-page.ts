import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const validatePage: Tool = {
  def: {
    name: "validate_page",
    description: [
      "Validate a peblor page JSON against the current schema.",
      "Accepts a file path OR inline JSON.",
      "File paths inside content/pages/ use strict-load (route-aware: presets, global modules, section hydration, cross-ref checks) — output includes mode: 'strict-load'.",
      "File paths outside content/pages/ and all inline JSON use schema-only validation — output includes mode: 'schema-only'.",
      "Use the file path form whenever the page lives on disk; reserve inline JSON for drafts that have no route yet.",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          description:
            "Absolute path to a page JSON file. Paths inside content/pages/ get strict-load validation.",
        },
        json: {
          type: "string",
          description:
            "Inline page JSON string. Always validated schema-only (no route context, no global preset/module loading).",
        },
      },
    },
  },
  run: async (args) => {
    const { file, json } = args as { file?: string; json?: string };
    if (!file && !json) throw new Error("Either 'file' or 'json' must be provided");
    if (json) {
      const tmp = join(tmpdir(), `pb-validate-${Date.now()}.json`);
      await writeFile(tmp, json, "utf-8");
      try {
        return await runCli(["validate", tmp]);
      } finally {
        await unlink(tmp).catch((err) =>
          console.warn("[pb-mcp] Failed to clean up temp file", tmp, err)
        );
      }
    }
    return runCli(["validate", file!]);
  },
};
