import { describe, expect, it } from "vitest";
import { sectionSchema } from "@pb/contracts";
import { buildLayoutScrollSection, getDefaultLayoutScrollDraft } from "./layout-scroll-dev-state";

describe("layout-scroll-dev-state", () => {
  it("builds a valid scrollContainer block", () => {
    const section = buildLayoutScrollSection(getDefaultLayoutScrollDraft());
    expect(section.type).toBe("scrollContainer");
    expect(section.scrollDirection).toBe("horizontal");
    expect(section.scrollProgressTrigger).toBeUndefined();
    expect(section.scrollProgressTriggerId).toBeUndefined();
    expect(section.elements).toHaveLength(10);
    expect(section.minHeight).toBe("28rem");
    expect(section.elements[0]).toMatchObject({ width: "18rem" });
    const parsed = sectionSchema.safeParse(section);
    expect(parsed.success).toBe(true);
  });

  it("pins vertical scroll viewport height so overflow stays inside the section", () => {
    const section = buildLayoutScrollSection({
      ...getDefaultLayoutScrollDraft(),
      scrollDirection: "vertical",
      minHeight: "22rem",
    });
    expect(section.scrollDirection).toBe("vertical");
    expect(section.minHeight).toBe("22rem");
    expect(section.height).toBe("22rem");
    expect(sectionSchema.safeParse(section).success).toBe(true);
  });

  it("does not force a height for horizontal scroll (row uses minHeight only)", () => {
    const section = buildLayoutScrollSection({
      ...getDefaultLayoutScrollDraft(),
      scrollDirection: "horizontal",
      minHeight: "22rem",
    });
    expect(section.height).toBeUndefined();
  });
});
