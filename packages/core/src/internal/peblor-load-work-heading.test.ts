import { describe, it, expect } from "vitest";
import { loadPeblorAsync } from "./peblor-load";
import { expandPeblor } from "./peblor-expand";

describe("work page heading", () => {
  it("work page expansion includes the visible heading element", async () => {
    const work = await loadPeblorAsync("work");
    expect(work).not.toBeNull();

    const { sections } = expandPeblor(work!);

    const headings = sections.flatMap(
      (s) =>
        (s as { elements?: { type?: string; text?: string }[] }).elements?.filter(
          (el) => el.type === "elementHeading" && el.text === "Work"
        ) ?? []
    );

    expect(headings.length).toBeGreaterThan(0);
  });
});
