import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const scaffoldPage: Tool = {
  def: {
    name: "scaffold_page",
    description:
      "Generate a page JSON scaffold for a route. Returns the JSON so you can inspect before saving. Pass 'out' to also write to disk.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Route path (e.g. '/about')" },
        out: { type: "string", description: "Write the scaffold to this file path" },
        from: { type: "string", description: "Base on an existing cluster ID or preset file" },
        force: { type: "boolean", description: "Overwrite if output file exists" },
      },
      required: ["route"],
    },
  },
  run: async (args) => {
    const { route, out, from, force } = args as {
      route: string;
      out?: string;
      from?: string;
      force?: boolean;
    };
    const tmp = join(tmpdir(), `pb-scaffold-${Date.now()}.json`);
    const outputPath = out ?? tmp;
    const extra: string[] = ["--out", outputPath, "--force"];
    if (from) extra.push("--from", from);
    if (force) extra.push("--force");
    await runCli(["scaffold", route, ...extra]);
    const scaffolded = JSON.parse(await readFile(outputPath, "utf-8"));
    if (!out)
      await unlink(tmp).catch((err) =>
        console.warn("[pb-mcp] Failed to clean up temp file", tmp, err)
      );
    return out ? { path: outputPath, scaffolded } : { scaffolded };
  },
};
