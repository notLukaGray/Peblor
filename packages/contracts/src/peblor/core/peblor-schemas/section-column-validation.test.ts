import { describe, expect, it } from "vitest";
import { hasValidSectionColumnAssignments } from "./section-column-validation";

describe("hasValidSectionColumnAssignments", () => {
  const elements = [{ id: "a" }, { id: "b" }];

  it("rejects flat assignments past the smallest responsive column count", () => {
    expect(
      hasValidSectionColumnAssignments({
        elements,
        columns: { base: 2, md: 4 },
        columnAssignments: { a: 3 },
      })
    ).toBe(false);
  });

  it("accepts flat assignments valid on both breakpoints", () => {
    expect(
      hasValidSectionColumnAssignments({
        elements,
        columns: { base: 2, md: 4 },
        columnAssignments: { a: 0, b: 1 },
      })
    ).toBe(true);
  });

  it("keeps scalar columns using the shared column count", () => {
    expect(
      hasValidSectionColumnAssignments({
        elements,
        columns: 4,
        columnAssignments: { a: 3 },
      })
    ).toBe(true);
  });
});
