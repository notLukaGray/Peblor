import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const doctorPage: Tool = {
  def: {
    name: "doctor_page",
    description:
      "Debug a peblor page through each pipeline stage (load → validate → expand → resolve → assets) to find where it fails.",
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
    return runCli(["doctor", file, ...extra]);
  },
};

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
      const { join } = await import("node:path");
      const { tmpdir } = await import("node:os");
      const tmp = join(tmpdir(), `pb-fragment-${Date.now()}.json`);
      await writeFile(tmp, json, "utf-8");
      try {
        return await runCli(["doctor", "--fragment", tmp]);
      } finally {
        await unlink(tmp).catch(() => {});
      }
    }
    return runCli(["doctor", "--fragment", file!]);
  },
};
