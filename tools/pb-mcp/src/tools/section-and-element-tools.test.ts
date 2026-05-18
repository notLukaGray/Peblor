import { describe, expect, it } from "vitest";
import { listElementTypes } from "./list-element-types.js";
import { explainSectionType } from "./explain-section-type.js";
import { explainElementType } from "./explain-element-type.js";

describe("section and element discovery tools", () => {
  it("lists element type literals with fields", async () => {
    const rows = (await listElementTypes.run({})) as Array<{ type: string; rootFields: string[] }>;
    expect(rows.length).toBeGreaterThan(10);
    const heading = rows.find((r) => r.type === "elementHeading");
    expect(heading).toBeTruthy();
    expect(heading?.rootFields).toContain("motion");
  });

  it("explains one section type", async () => {
    const detail = (await explainSectionType.run({ type: "sectionColumn" })) as {
      type: string;
      rootFields: string[];
    };
    expect(detail.type).toBe("sectionColumn");
    expect(detail.rootFields).toContain("columnAssignments");
  });

  it("explains one element type", async () => {
    const detail = (await explainElementType.run({ type: "elementButton" })) as {
      type: string;
      rootFields: string[];
    };
    expect(detail.type).toBe("elementButton");
    expect(detail.rootFields).toContain("motion");
  });
});
