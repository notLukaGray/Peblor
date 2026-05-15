import { describe, expect, it } from "vitest";
import type { PageTags, SectionBlock } from "@pb/contracts";
import { filterPageByActiveTags } from "./peblor-filter-pass";

const getProjectTags = (slug: string): PageTags | undefined => {
  if (slug === "work/project-brand") return { brand: ["Example"] };
  return undefined;
};

describe("filterPageByActiveTags layout cleanup", () => {
  it("removes namespaced ids from sectionColumn order and layout maps", () => {
    const section = {
      type: "sectionColumn",
      elementOrder: ["section_a:el-a", "section_a:el-b"],
      elements: [
        { type: "elementBody", id: "section_a:el-a" },
        { type: "elementBody", id: "section_a:el-b" },
      ],
      columnAssignments: { "section_a:el-a": 1, "section_a:el-b": 2 },
      columnSpan: {
        mobile: { "section_a:el-a": 6, "section_a:el-b": 6 },
        desktop: { "section_a:el-a": 4, "section_a:el-b": 8 },
      },
      itemStyles: {
        "section_a:el-a": { alignSelf: "start" },
        "section_a:el-b": { alignSelf: "end" },
      },
      itemLayout: {
        mobile: { "section_a:el-a": { row: 1 }, "section_a:el-b": { row: 2 } },
        desktop: { "section_a:el-a": { row: 1 }, "section_a:el-b": { row: 2 } },
      },
    } as unknown as SectionBlock;

    const result = filterPageByActiveTags({
      sections: [section],
      projectGroups: { removeB: { projectSlug: "work/project-brand", elements: ["el-b"] } },
      activeFilters: { brand: ["alpha"] },
      getProjectTags,
    });
    const next = result.sections[0] as unknown as Record<string, unknown>;
    expect(next.elementOrder).toEqual(["section_a:el-a"]);
    expect((next.elements as Array<{ id: string }>).map((el) => el.id)).toEqual(["section_a:el-a"]);
    expect(next.columnAssignments).toEqual({ "section_a:el-a": 1 });
    expect(next.columnSpan).toEqual({
      mobile: { "section_a:el-a": 6 },
      desktop: { "section_a:el-a": 4 },
    });
    expect(next.itemStyles).toEqual({ "section_a:el-a": { alignSelf: "start" } });
    expect(next.itemLayout).toEqual({
      mobile: { "section_a:el-a": { row: 1 } },
      desktop: { "section_a:el-a": { row: 1 } },
    });
  });
});
