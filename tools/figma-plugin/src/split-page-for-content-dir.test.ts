import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { splitPageForContentDir } from "./split-page-for-content-dir";

const _dir = dirname(fileURLToPath(import.meta.url));

describe("splitPageForContentDir", () => {
  it("moves sectionOrder blocks into separate files and keeps shared defs in index", () => {
    const raw = readFileSync(join(_dir, "__fixtures__/layout-alignment-reference.json"), "utf-8");
    const page = JSON.parse(raw) as Record<string, unknown>;
    const { index, sectionFiles } = splitPageForContentDir(page, "fixture-layout");

    expect(index.sectionOrder).toEqual(["hero"]);
    const defs = index.definitions as Record<string, unknown>;
    expect(defs.hero).toBeUndefined();
    expect(sectionFiles.hero).toMatchObject({ type: "contentBlock" });
    expect(index.slug).toBe("fixture-layout");
  });

  it("falls back slug and leaves definitions untouched when sectionOrder is missing", () => {
    const page = {
      title: "No order",
      definitions: { hero: { type: "contentBlock" } },
    } as Record<string, unknown>;
    const { index, sectionFiles } = splitPageForContentDir(page, "fallback-slug");

    expect(index.slug).toBe("fallback-slug");
    expect(index.definitions).toMatchObject({ hero: { type: "contentBlock" } });
    expect(sectionFiles).toEqual({});
  });

  it("normalizes non-object definitions input to empty object", () => {
    const page = {
      slug: "typed",
      sectionOrder: ["hero"],
      definitions: "bad-shape",
    } as unknown as Record<string, unknown>;
    const { index, sectionFiles } = splitPageForContentDir(page, "fallback");

    expect(index.definitions).toEqual({});
    expect(sectionFiles).toEqual({});
    expect(index.slug).toBe("typed");
  });
});
