import { describe, expect, it } from "vitest";
import { parseExportTargetFromLayerName } from "./export-target-parse";
import { inferContextualInsights } from "./context-inference";

describe("parseExportTargetFromLayerName", () => {
  it("parses Page and Section prefixes", () => {
    expect(parseExportTargetFromLayerName("Page/Home")).toMatchObject({
      kind: "page",
      key: "home",
    });
    expect(parseExportTargetFromLayerName("Section/Hero Dark")).toMatchObject({
      kind: "preset",
      key: "hero-dark",
    });
  });

  it("strips annotations before parsing", () => {
    expect(parseExportTargetFromLayerName("Page/About [pb: sticky=true]")).toMatchObject({
      kind: "page",
      key: "about",
    });
  });
});

describe("inferContextualInsights", () => {
  it("warns when Global/ sits under Page/", () => {
    const { issues } = inferContextualInsights(
      {
        id: "1",
        name: "Global/social",
        type: "FRAME",
        width: 100,
        height: 40,
        childCount: 0,
        hasAutoLayout: true,
      },
      { parentName: "Page/landing" }
    );
    expect(issues.some((i) => i.message.includes("globals.json"))).toBe(true);
  });

  it("suggests rename from main component for generic frame", () => {
    const { suggestions } = inferContextualInsights(
      {
        id: "1",
        name: "Frame 12",
        type: "FRAME",
        width: 100,
        height: 40,
        childCount: 1,
        hasAutoLayout: false,
      },
      { mainComponentName: "Primary Button" }
    );
    expect(suggestions.some((s) => s.label.includes("primary-button"))).toBe(true);
  });
});
