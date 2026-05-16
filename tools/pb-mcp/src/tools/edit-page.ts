import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";
import { findPage } from "../lib/fs.js";
import { mergePatch } from "../lib/merge-patch.js";

export const editPage: Tool = {
  def: {
    name: "edit_page",
    description:
      "Apply a JSON merge patch (RFC 7396) to a page, validate the result, and optionally write it back. Returns patched JSON + validation diagnostics. Nothing is written to disk unless write: true.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Route of the page to edit" },
        patch: {
          type: "object",
          description:
            "JSON merge patch: keys set values, null removes keys, nested objects merge recursively, arrays replace entirely.",
        },
        write: {
          type: "boolean",
          description: "Write the patched JSON back to disk (default false)",
        },
      },
      required: ["route", "patch"],
    },
  },
  run: async (args) => {
    const { route, patch, write } = args as {
      route: string;
      patch: Record<string, unknown>;
      write?: boolean;
    };
    const { content, path } = await findPage(route);
    const patched = mergePatch(content, patch) as Record<string, unknown>;
    const patchedJson = JSON.stringify(patched, null, 2);

    const tmp = join(tmpdir(), `pb-edit-${Date.now()}.json`);
    await writeFile(tmp, patchedJson, "utf-8");
    let validation: unknown;
    try {
      validation = await runCli(["validate", tmp]);
    } finally {
      await unlink(tmp).catch(() => {});
    }

    if (write) await writeFile(path, patchedJson, "utf-8");
    return { path, patched, validation, written: write ?? false };
  },
};
