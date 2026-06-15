import { describe, expect, it, vi } from "vitest";

describe("getPeblorPageFilterIndex", () => {
  it("builds a compact filter index from project groups and page tags", async () => {
    vi.resetModules();
    const calls: string[] = [];
    vi.doMock("./peblor-load", () => ({
      getPageMetadataAsync: async (slug: string) => {
        calls.push(slug);
        if (slug === "work/project-alpha") {
          return {
            title: "Alpha",
            tags: {
              brand: ["Alpha"],
              ability: ["Art Direction"],
            },
          };
        }
        return { title: "Beta" };
      },
    }));

    const { getPeblorPageFilterIndex } = await import("./peblor-page-filter-index");
    const index = await getPeblorPageFilterIndex({
      slug: "work",
      filterConfig: {
        categories: [
          { key: "brand", label: "Brand" },
          { key: "ability", label: "Ability" },
        ],
      },
      projectGroups: {
        alphaPrimary: {
          projectSlug: "work/project-alpha",
          elements: ["alpha-item", "alpha-preview"],
        },
        alphaDuplicate: {
          projectSlug: "work/project-alpha",
          elements: ["alpha-preview", "alpha-bg"],
        },
        beta: {
          projectSlug: "work/project-beta",
          elements: ["beta-item"],
        },
      },
    });

    expect(index).toEqual({
      filterCategories: ["brand", "ability"],
      elementKeysByProject: {
        "work/project-alpha": ["alpha-item", "alpha-preview", "alpha-bg"],
        "work/project-beta": ["beta-item"],
      },
      projectTagsBySlug: {
        "work/project-alpha": {
          brand: ["Alpha"],
          ability: ["Art Direction"],
        },
      },
    });
    expect(calls.sort()).toEqual(["work/project-alpha", "work/project-beta"]);
  });

  it("returns null for pages without filter metadata", async () => {
    const { getPeblorPageFilterIndex } = await import("./peblor-page-filter-index");

    await expect(
      getPeblorPageFilterIndex({
        slug: "work",
      })
    ).resolves.toBeNull();
  });
});
