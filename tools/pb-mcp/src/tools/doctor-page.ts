import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";
import { OVERLAYS_DIR } from "../lib/paths.js";

// ── overlay resolution helper ────────────────────────────────────────────────

type OverlayInfo = {
  id: string;
  file: string;
  definitionKey: string;
  scope: "global";
};

/**
 * Read the overlays directory and the page's disableOverlays field to produce
 * a structured summary of which overlays are active for this page.
 *
 * This is MCP-layer enrichment — the CLI doctor does not surface this.
 */
async function resolvePageOverlays(pageFile: string): Promise<{
  active: OverlayInfo[];
  disabled: string[];
  totalKeys: number;
}> {
  // Read the page to get disableOverlays (best-effort; fail open).
  let disableOverlays: string[] = [];
  try {
    const raw = await readFile(pageFile, "utf-8");
    const page = JSON.parse(raw) as Record<string, unknown>;
    if (Array.isArray(page.disableOverlays)) {
      disableOverlays = (page.disableOverlays as unknown[]).filter(
        (v): v is string => typeof v === "string"
      );
    }
  } catch (err) {
    console.warn("[pb-mcp] Failed to read page file for overlay resolution", pageFile, err);
  }

  const disabledSet = new Set(disableOverlays);

  // List overlay files.
  let entries;
  try {
    entries = await readdir(OVERLAYS_DIR, { withFileTypes: true });
  } catch (err) {
    console.warn("[pb-mcp] Failed to list overlays directory for doctor", err);
    return { active: [], disabled: disableOverlays, totalKeys: 0 };
  }

  const active: OverlayInfo[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const id = entry.name.replace(/\.json$/, "");
    if (disabledSet.has(id)) continue;

    const overlayFilePath = join(OVERLAYS_DIR, entry.name);

    // The definition key is the overlay's `id` field if present, else the filename.
    let definitionKey = id;
    try {
      const raw = await readFile(overlayFilePath, "utf-8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      if (typeof data.id === "string" && data.id.length > 0) {
        definitionKey = data.id;
      }
    } catch (err) {
      console.warn(
        "[pb-mcp] Failed to read overlay file, using filename as id",
        overlayFilePath,
        err
      );
    }

    active.push({ id, file: overlayFilePath, definitionKey, scope: "global" });
  }

  active.sort((a, b) => a.id.localeCompare(b.id));

  return { active, disabled: disableOverlays, totalKeys: active.length };
}

// ── doctor_page ──────────────────────────────────────────────────────────────

export const doctorPage: Tool = {
  def: {
    name: "doctor_page",
    description:
      "Debug a peblor page through each pipeline stage (load → validate → expand → resolve → assets) " +
      "to find where it fails. Output includes an overlays summary showing which global overlays are " +
      "active for this page and what definition key each contributes.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to the page JSON file" },
        stage: {
          type: "string",
          enum: ["load", "validate", "expand", "resolve", "assets"],
          description: "Stop at a specific pipeline stage",
        },
      },
      required: ["file"],
    },
  },
  run: async (args) => {
    const { file, stage } = args as { file: string; stage?: string };
    const extra = stage ? ["--stage", stage] : [];

    // Run the CLI doctor and resolve overlay info in parallel.
    const [cliResult, overlays] = await Promise.all([
      runCli(["doctor", file, ...extra]),
      resolvePageOverlays(file),
    ]);

    // Enrich the CLI result with overlay information.
    if (cliResult != null && typeof cliResult === "object" && !Array.isArray(cliResult)) {
      return { ...(cliResult as Record<string, unknown>), overlays };
    }

    // Fallback: CLI returned an unexpected shape — wrap it.
    return { result: cliResult, overlays };
  },
};

// ── doctor_fragment ──────────────────────────────────────────────────────────

export const doctorFragment: Tool = {
  def: {
    name: "doctor_fragment",
    description:
      "Validate a single section JSON fragment in isolation against sectionDefinitionBlockSchema — no full page needed. Use this to check a section you're authoring before embedding it in a page.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Absolute path to a section fragment JSON file" },
        json: {
          type: "string",
          description: "Inline section JSON to validate without writing to disk",
        },
      },
    },
  },
  run: async (args) => {
    const { file, json } = args as { file?: string; json?: string };
    if (!file && !json) throw new Error("Either 'file' or 'json' must be provided");
    if (json) {
      const { writeFile, unlink } = await import("node:fs/promises");
      const { join: pathJoin } = await import("node:path");
      const { tmpdir } = await import("node:os");
      const tmp = pathJoin(tmpdir(), `pb-fragment-${Date.now()}.json`);
      await writeFile(tmp, json, "utf-8");
      try {
        return await runCli(["doctor", "--fragment", tmp]);
      } finally {
        await unlink(tmp).catch((err) =>
          console.warn("[pb-mcp] Failed to clean up temp file", tmp, err)
        );
      }
    }
    return runCli(["doctor", "--fragment", file!]);
  },
};
