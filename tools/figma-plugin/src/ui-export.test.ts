import { describe, expect, it } from "vitest";
import { mergedPageClipboardPayload } from "./ui-export";
import type { ExportResult } from "./types/figma-plugin";

function makeResult(overrides: Partial<ExportResult>): ExportResult {
  return {
    pages: {},
    presets: {},
    modals: {},
    modules: {},
    globals: {},
    assets: [],
    warnings: [],
    elementCount: 0,
    ...overrides,
  };
}

describe("mergedPageClipboardPayload", () => {
  it("injects figmaExportDiagnostics into single-page payload", () => {
    const payload = mergedPageClipboardPayload(
      makeResult({
        pages: {
          home: {
            slug: "home",
            title: "Home",
            sectionOrder: [],
            definitions: {},
          },
        },
        trace: {
          counts: {
            severity: { error: 0, warn: 0, info: 0 },
            category: { structure: 2 },
            parity: {
              converted: 3,
              fallback: 1,
              dropped: 2,
              fallbackReasons: { "group-conversion-fallback": 1 },
              dropReasons: { "convert-node-null:TEXT": 2 },
            },
          },
          frames: [],
        },
      })
    );

    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const diagnostics = parsed["figmaExportDiagnostics"] as Record<string, unknown>;
    expect(diagnostics).toBeTruthy();
    expect(diagnostics["converted"]).toBe(3);
    expect(diagnostics["fallback"]).toBe(1);
    expect(diagnostics["dropped"]).toBe(2);
  });

  it("injects root diagnostics for multi-page wrapper payload", () => {
    const payload = mergedPageClipboardPayload(
      makeResult({
        pages: {
          one: { slug: "one", title: "One", sectionOrder: [], definitions: {} },
          two: { slug: "two", title: "Two", sectionOrder: [], definitions: {} },
        },
        presets: { p1: { type: "contentBlock", id: "p1", elements: [] } },
        trace: {
          counts: {
            severity: { error: 0, warn: 0, info: 0 },
            category: {},
            parity: {
              converted: 2,
              fallback: 0,
              dropped: 0,
              fallbackReasons: {},
              dropReasons: {},
            },
          },
          frames: [],
        },
      })
    );

    const parsed = JSON.parse(payload) as Record<string, unknown>;
    expect(parsed["pages"]).toBeTruthy();
    expect(parsed["figmaExportDiagnostics"]).toBeTruthy();
  });
});
