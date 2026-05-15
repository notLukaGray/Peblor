import { describe, expect, it } from "vitest";
import { summarizePageFigmaDiagnostics } from "./peblor-validation";

describe("summarizePageFigmaDiagnostics", () => {
  it("parses embedded exporter diagnostics and scans definitions", () => {
    const summary = summarizePageFigmaDiagnostics({
      slug: "x",
      title: "t",
      sectionOrder: ["a"],
      definitions: {
        a: {
          type: "contentBlock",
          id: "a",
          elementOrder: ["e1"],
          definitions: {
            e1: {
              type: "elementGroup",
              id: "e1",
              meta: { figma: { fallbackReason: "group-conversion-fallback", sourceType: "FRAME" } },
            },
          },
        },
      },
      figmaExportDiagnostics: {
        version: 1,
        converted: 4,
        fallback: 1,
        dropped: 0,
        topFallbackReasons: [{ code: "group-conversion-fallback", count: 1 }],
        highRiskWarnings: [{ category: "structure", count: 2 }],
      },
    });
    expect(summary).not.toBeNull();
    expect(summary!.embedded?.converted).toBe(4);
    expect(summary!.embedded?.dropped).toBe(0);
    expect(summary!.scannedFallbackElements).toBe(1);
    expect(summary!.scannedTopFallbackReasons[0]?.code).toBe("group-conversion-fallback");
  });

  it("returns null for non-object input", () => {
    expect(summarizePageFigmaDiagnostics(null)).toBeNull();
  });

  it("returns scan-only summary when embedded diagnostics are missing", () => {
    const summary = summarizePageFigmaDiagnostics({
      slug: "x",
      title: "t",
      sectionOrder: ["a"],
      definitions: {
        a: {
          type: "contentBlock",
          id: "a",
          elementOrder: ["e1", "e2"],
          definitions: {
            e1: {
              type: "elementGroup",
              id: "e1",
              meta: { figma: { fallbackReason: "group-conversion-fallback" } },
            },
            e2: {
              type: "elementHeading",
              id: "e2",
              text: "Title",
              level: 2,
            },
          },
        },
      },
    });
    expect(summary).toEqual({
      embedded: null,
      scannedFallbackElements: 1,
      scannedTopFallbackReasons: [{ code: "group-conversion-fallback", count: 1 }],
    });
  });
});
