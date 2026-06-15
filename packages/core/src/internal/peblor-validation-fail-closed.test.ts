import { afterEach, describe, expect, it, vi } from "vitest";

describe("peblor validation fail-closed", () => {
  afterEach(() => vi.resetModules());

  it("throws when a loaded page fails schema validation", async () => {
    vi.resetModules();

    vi.doMock("./load/peblor-discover-pages", () => ({
      discoverAllPages: async () => [],
      resolvePagePath: async () => "/tmp/fake/index.json",
    }));

    vi.doMock("./load/peblor-load-io", () => ({
      readPageJsonByPath: async () => ({
        slug: "bad/page",
        title: "Bad page",
        sectionOrder: ["hero"],
      }),
      PAGE_DATA_DIR: "/tmp",
      parseJsonSafe: () => ({ ok: false as const, error: new Error("unused") }),
    }));

    vi.doMock("./load/peblor-load-definitions", () => ({
      getDefinitionsForPage: () => ({ hero: { type: "notASection" } }),
      getDefinitionsForPageAsync: async () => ({ hero: { type: "notASection" } }),
      mergeGlobalModulesIntoDefinitionsAsync: async (defs: Record<string, unknown>) => defs,
      hydrateSectionFilesBySegmentsAsync: async (defs: Record<string, unknown>) => defs,
      resolveDefinitionPresets: (defs: Record<string, unknown>) => defs,
    }));

    vi.doMock("./load/peblor-load-presets", () => ({
      buildPresetsAsync: async () => ({}),
    }));

    const { loadPeblorByPathAsync } = await import("./peblor-load");

    await expect(loadPeblorByPathAsync(["bad", "page"])).rejects.toThrow();
  });
});
