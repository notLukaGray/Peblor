import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";
import { listPages } from "../lib/fs.js";

export const batchValidate: Tool = {
  def: {
    name: "batch_validate",
    description:
      "Validate all pages in the project. Returns per-page diagnostics and a summary of errors.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => {
    const pages = await listPages();
    const results = await Promise.all(
      pages.map(async ({ route, path }) => {
        try {
          return { route, path, diagnostics: await runCli(["validate", path]) };
        } catch (err) {
          return { route, path, error: err instanceof Error ? err.message : String(err) };
        }
      })
    );
    const errorCount = results.filter((r) => "error" in r).length;
    return { summary: { total: pages.length, errors: errorCount }, pages: results };
  },
};
