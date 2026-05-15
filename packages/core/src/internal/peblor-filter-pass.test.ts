import { describe, expect, it } from "vitest";
import type { PageTags, ProjectGroupsMap, SectionBlock } from "@pb/contracts";
import { filterPageByActiveTags, slugifyTagValue } from "./peblor-filter-pass";

const projectGroups: ProjectGroupsMap = {
  alpha: {
    projectSlug: "work/project-alpha-test",
    elements: ["bg-alpha", "alpha-item", "alpha-preview"],
  },
  brand: {
    projectSlug: "work/project-brand",
    elements: ["bg-brand", "brand-item", "brand-preview"],
  },
};

const tagsBySlug: Record<string, PageTags> = {
  "work/project-alpha-test": {
    brand: ["ExampleA"],
    ability: ["Art Direction", "CGI"],
  },
  "work/project-brand": {
    brand: ["ExampleB"],
    ability: ["Brand Identity"],
  },
};

const getProjectTags = (slug: string): PageTags | undefined => tagsBySlug[slug];

function makeSections(): SectionBlock[] {
  return [
    {
      type: "contentBlock",
      elementOrder: ["bg-alpha", "bg-brand", "page-heading", "layout"],
      elements: [
        { type: "elementGroup", id: "bg-alpha" },
        { type: "elementGroup", id: "bg-brand" },
        { type: "elementBody", id: "page-heading", text: "Work" },
        {
          type: "elementGroup",
          id: "layout",
          section: {
            elementOrder: ["list-col", "preview-col"],
            definitions: {
              "list-col": {
                type: "elementGroup",
                section: {
                  elementOrder: ["alpha-item", "brand-item"],
                  definitions: {
                    "alpha-item": { type: "elementBody", text: "ExampleA × Test" },
                    "brand-item": { type: "elementBody", text: "ExampleB" },
                  },
                },
              },
              "preview-col": {
                type: "elementGroup",
                section: {
                  elementOrder: ["alpha-preview", "brand-preview"],
                  definitions: {
                    "alpha-preview": { type: "elementGroup" },
                    "brand-preview": { type: "elementGroup" },
                  },
                },
              },
            },
          },
        },
      ],
    } as unknown as SectionBlock,
  ];
}

describe("filterPageByActiveTags", () => {
  it("is a no-op when no filters are active", () => {
    const sections = makeSections();
    const result = filterPageByActiveTags({
      sections,
      projectGroups,
      activeFilters: {},
      getProjectTags,
    });
    expect(result.removedKeys.size).toBe(0);
    expect(result.sections).toBe(sections);
  });

  it("is a no-op when active filters list is empty arrays", () => {
    const sections = makeSections();
    const result = filterPageByActiveTags({
      sections,
      projectGroups,
      activeFilters: { brand: [] },
      getProjectTags,
    });
    expect(result.removedKeys.size).toBe(0);
    expect(result.sections).toBe(sections);
  });

  it("drops elements for projects whose tags don't match a single-category filter", () => {
    const result = filterPageByActiveTags({
      sections: makeSections(),
      projectGroups,
      activeFilters: { brand: ["examplea"] },
      getProjectTags,
    });

    expect(result.removedKeys).toEqual(new Set(["bg-brand", "brand-item", "brand-preview"]));

    const top = result.sections[0] as unknown as {
      elementOrder: string[];
      elements: { id: string; section?: { elementOrder?: string[] } }[];
    };
    expect(top.elementOrder).toEqual(["bg-alpha", "page-heading", "layout"]);
    expect(top.elements.map((e) => e.id)).toEqual(["bg-alpha", "page-heading", "layout"]);

    const layout = top.elements.find((e) => e.id === "layout") as unknown as {
      section: {
        definitions: Record<
          string,
          {
            section: {
              elementOrder: string[];
              definitions: Record<string, unknown>;
            };
          }
        >;
      };
    };
    expect(layout.section.definitions["list-col"]!.section.elementOrder).toEqual(["alpha-item"]);
    expect(Object.keys(layout.section.definitions["list-col"]!.section.definitions)).toEqual([
      "alpha-item",
    ]);
    expect(layout.section.definitions["preview-col"]!.section.elementOrder).toEqual([
      "alpha-preview",
    ]);
  });

  it("drops expanded top-level elements whose ids were namespaced during page expansion", () => {
    const sections = makeSections() as unknown as Array<{
      elements: Array<{ id: string; type: string }>;
      elementOrder: string[];
    }>;
    sections[0]!.elements[0]!.id = "contentBlock_0:bg-alpha";
    sections[0]!.elements[1]!.id = "contentBlock_0:bg-brand";

    const result = filterPageByActiveTags({
      sections: sections as unknown as SectionBlock[],
      projectGroups,
      activeFilters: { brand: ["examplea"] },
      getProjectTags,
    });

    const top = result.sections[0] as unknown as {
      elementOrder: string[];
      elements: { id: string }[];
    };
    expect(top.elementOrder).toEqual(["bg-alpha", "page-heading", "layout"]);
    expect(top.elements.map((e) => e.id)).toEqual([
      "contentBlock_0:bg-alpha",
      "page-heading",
      "layout",
    ]);
  });

  it("AND-combines categories: project must match every active category", () => {
    const onlyMatchingBrand = filterPageByActiveTags({
      sections: makeSections(),
      projectGroups,
      activeFilters: { brand: ["examplea"], ability: ["brand-identity"] },
      getProjectTags,
    });
    // ExampleA matches brand=examplea but not ability=brand-identity → dropped.
    // ExampleB fails brand → dropped.
    expect(onlyMatchingBrand.removedKeys).toEqual(
      new Set([
        "bg-alpha",
        "alpha-item",
        "alpha-preview",
        "bg-brand",
        "brand-item",
        "brand-preview",
      ])
    );
  });

  it("OR-combines values within a single category", () => {
    const result = filterPageByActiveTags({
      sections: makeSections(),
      projectGroups,
      activeFilters: { brand: ["examplea", "exampleb"] },
      getProjectTags,
    });
    expect(result.removedKeys.size).toBe(0);
  });

  it("matches case-insensitively and handles multi-word slugs", () => {
    expect(slugifyTagValue("Multi Word Value")).toBe("multi-word-value");
    expect(slugifyTagValue("  Art Direction ")).toBe("art-direction");

    const tags: Record<string, PageTags> = {
      "work/cleanup": { brand: ["Multi Word Value"] },
    };
    const result = filterPageByActiveTags({
      sections: [
        {
          type: "contentBlock",
          elementOrder: ["cleanup-item"],
          elements: [{ type: "elementBody", id: "cleanup-item" }],
        } as unknown as SectionBlock,
      ],
      projectGroups: {
        cleanup: { projectSlug: "work/cleanup", elements: ["cleanup-item"] },
      },
      activeFilters: { brand: ["multi-word-value"] },
      getProjectTags: (slug) => tags[slug],
    });
    expect(result.removedKeys.size).toBe(0);
  });

  it("treats projects with no tags as non-matching when filters are active", () => {
    const result = filterPageByActiveTags({
      sections: makeSections(),
      projectGroups,
      activeFilters: { brand: ["examplea"] },
      getProjectTags: () => undefined,
    });
    // Both projects fail (no tags), so all elements drop.
    expect(result.removedKeys.size).toBe(6);
  });

  it("ignores filter categories the project doesn't have when filters list is empty", () => {
    const result = filterPageByActiveTags({
      sections: makeSections(),
      projectGroups,
      activeFilters: { topic: [] },
      getProjectTags,
    });
    expect(result.removedKeys.size).toBe(0);
  });
});
