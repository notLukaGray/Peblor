import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Tool } from "../types.js";
import { findPage } from "../lib/fs.js";

type SidecarStatus = "loaded" | "not-found" | "error";

export const readPage: Tool = {
  def: {
    name: "read_page",
    description:
      "Read a page by route and return its raw JSON. " +
      "Pass hydrated: true to inline sidecar section files into the definitions so you see the complete " +
      "page in one call. Each hydrated section is annotated with _source: 'sidecar' and _sourceFile " +
      "so you know where to direct edits. Without hydrated, sections that live in sidecar files appear " +
      "as missing keys in definitions — you would need separate reads to see them.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Route path (e.g. '/work', '/work/project-x')" },
        hydrated: {
          type: "boolean",
          description:
            "If true, inline sidecar section files into the definitions. " +
            "Sections that already exist in definitions are left as-is. " +
            "Missing sidecar files are reported in sidecarFiles with status 'not-found'.",
        },
      },
      required: ["route"],
    },
  },
  run: async (args) => {
    const { route, hydrated } = args as { route: string; hydrated?: boolean };
    const { content, path } = await findPage(route);

    if (!hydrated) {
      return { path, content };
    }

    // ── hydrated mode: inline sidecar sections ───────────────────────────────

    const pageDir = dirname(path);
    const sectionOrder = Array.isArray(content.sectionOrder)
      ? (content.sectionOrder as unknown[]).filter((v): v is string => typeof v === "string")
      : [];

    const definitions =
      content.definitions != null &&
      typeof content.definitions === "object" &&
      !Array.isArray(content.definitions)
        ? { ...(content.definitions as Record<string, unknown>) }
        : {};

    const sidecarFiles: Array<{ key: string; file: string; status: SidecarStatus }> = [];

    for (const key of sectionOrder) {
      // Already present in definitions — no sidecar needed.
      if (key in definitions) continue;

      const sidecarPath = join(pageDir, `${key}.json`);
      try {
        const raw = await readFile(sidecarPath, "utf-8");
        const sidecarContent = JSON.parse(raw) as Record<string, unknown>;
        // Annotate so the agent knows where this section lives.
        definitions[key] = {
          ...sidecarContent,
          _source: "sidecar",
          _sourceFile: sidecarPath,
        };
        sidecarFiles.push({ key, file: sidecarPath, status: "loaded" });
      } catch (err) {
        const status: SidecarStatus =
          err != null &&
          typeof err === "object" &&
          "code" in err &&
          (err as NodeJS.ErrnoException).code === "ENOENT"
            ? "not-found"
            : "error";
        sidecarFiles.push({ key, file: sidecarPath, status });
      }
    }

    const hydratedContent = { ...content, definitions };

    return {
      path,
      content: hydratedContent,
      hydrated: true,
      sidecarFiles,
      note:
        sidecarFiles.length > 0
          ? `${sidecarFiles.filter((s) => s.status === "loaded").length} sidecar section(s) inlined. ` +
            `To edit a sidecar section, write to its _sourceFile directly or open a session on the page.`
          : "All sections were already in definitions — no sidecar files inlined.",
    };
  },
};
