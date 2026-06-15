import { writeFile, unlink, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";
import { findPage } from "../lib/fs.js";
import { mergePatch } from "../lib/merge-patch.js";
import { filePathToSlugSegments } from "../lib/slug.js";
import { loadPeblorByPathAsync } from "@pb/core/loader";

export const editPage: Tool = {
  def: {
    name: "edit_page",
    description:
      "Apply a JSON merge patch (RFC 7396) to a page, validate the result, and optionally write it back. Returns patched JSON + validation diagnostics. Nothing is written to disk unless write: true. When write: true, a strict-load validation (same pipeline as the app) is run after writing; if it fails and force is not set, the original file is restored.",
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
        force: {
          type: "boolean",
          description:
            "Write even if strict-load validation fails after writing (not recommended). Only meaningful when write: true.",
        },
      },
      required: ["route", "patch"],
    },
  },
  run: async (args) => {
    const { route, patch, write, force } = args as {
      route: string;
      patch: Record<string, unknown>;
      write?: boolean;
      force?: boolean;
    };
    const { content, path: filePath } = await findPage(route);
    const patched = mergePatch(content, patch) as Record<string, unknown>;
    const patchedJson = JSON.stringify(patched, null, 2);

    // Schema-only validation via temp file — provides early diagnostics before any disk write.
    const tmp = join(tmpdir(), `pb-edit-${Date.now()}.json`);
    await writeFile(tmp, patchedJson, "utf-8");
    let validation: unknown;
    try {
      validation = await runCli(["validate", tmp]);
    } finally {
      await unlink(tmp).catch((err) =>
        console.warn("[pb-mcp] Failed to clean up temp file", tmp, err)
      );
    }

    if (!write) {
      return { path: filePath, patched, validation, written: false };
    }

    // Write path: commit to disk and gate on strict-load.
    const slugSegments = filePathToSlugSegments(filePath);

    // Save original content for rollback if we have a strict-load path.
    let originalContent: string | null = null;
    if (slugSegments) {
      try {
        originalContent = await readFile(filePath, "utf-8");
      } catch (err) {
        console.warn("[pb-mcp] Failed to read file for rollback (may be new file)", filePath, err);
      }
    }

    await writeFile(filePath, patchedJson, "utf-8");

    if (slugSegments) {
      try {
        await loadPeblorByPathAsync(slugSegments);
      } catch (err) {
        if (!force) {
          // Rollback.
          if (originalContent !== null) {
            await writeFile(filePath, originalContent, "utf-8");
          }
          const message = err instanceof Error ? err.message : String(err);
          return {
            path: filePath,
            patched,
            validation,
            written: false,
            validationMode: "strict-load",
            strictLoadError: message,
            hint: "The patched page failed strict-load validation (presets, modules, section hydration, cross-ref checks). Fix the errors and try again, or use force: true to write anyway.",
          };
        }
        // force: true — leave the file as written.
      }
    }

    return {
      path: filePath,
      patched,
      validation,
      written: true,
      validationMode: slugSegments ? "strict-load" : "schema-only",
    };
  },
};
