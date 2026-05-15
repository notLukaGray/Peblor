import { describe, expect, it } from "vitest";
import { sectionSchema } from "@pb/contracts";
import {
  buildLayoutColumnsSection,
  getDefaultLayoutColumnsDraft,
} from "./layout-columns-dev-state";

describe("layout-columns-dev-state", () => {
  it("builds a valid sectionColumn block from default draft", () => {
    const section = buildLayoutColumnsSection(getDefaultLayoutColumnsDraft());
    expect(section.type).toBe("sectionColumn");
    expect(section.columns).toEqual({ desktop: 3, mobile: 1 });
    expect(section.gridMode).toEqual({ desktop: "columns", mobile: "columns" });
    expect(section.elements).toHaveLength(8);
    expect(section.columnSpan).toEqual(
      expect.objectContaining({
        desktop: expect.objectContaining({ "col-item-3": 2 }),
      })
    );
    const parsed = sectionSchema.safeParse(section);
    expect(parsed.success).toBe(true);
  });

  it("normalizes empty size fields and keeps custom grid controls", () => {
    const section = buildLayoutColumnsSection({
      ...getDefaultLayoutColumnsDraft(),
      contentWidth: "",
      contentHeight: "full",
      desktopGridMode: "grid",
      mobileGridMode: "columns",
      desktopGap: "",
      mobileGap: "",
    });
    expect(section.contentWidth).toBeUndefined();
    expect(section.contentHeight).toBe("full");
    expect(section.gridMode).toEqual({ desktop: "grid", mobile: "columns" });
    expect(section.columnGaps).toEqual({ desktop: "1rem", mobile: "1rem" });
    const parsed = sectionSchema.safeParse(section);
    expect(parsed.success).toBe(true);
  });
});
