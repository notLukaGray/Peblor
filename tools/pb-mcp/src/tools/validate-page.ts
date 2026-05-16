import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const validatePage: Tool = {
  def: {
    name: "validate_page",
    description:
      "Validate a peblor page JSON against the current schema. Accepts a file path OR inline JSON — use inline to validate content before writing to disk.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to a page JSON file" },
        json: {
          type: "string",
          description: "Inline page JSON string to validate without writing to disk",
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
        await unlink(tmp).catch(() => {});
      }
    }
    return runCli(["validate", file!]);
  },
};
