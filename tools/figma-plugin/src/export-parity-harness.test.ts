import { describe, expect, it } from "vitest";
import {
  accumulateParityFromExportResult,
  accumulateParityFromSectionTree,
  buildParityTraceSnapshot,
  createExportParityState,
  EXPORT_DROP_REASON,
} from "./export-parity";
import { convertFrameToSection } from "./converters/node-to-section";
import type { ConversionContext } from "./types/figma-plugin";

(globalThis as unknown as { figma: { mixed: symbol } }).figma = { mixed: Symbol("mixed") };

function makeLinearGradientPaint(): GradientPaint {
  return {
    type: "GRADIENT_LINEAR",
    visible: true,
    gradientTransform: [
      [1, 0, 0],
      [0, 1, 0],
    ],
    gradientStops: [
      { position: 0, color: { r: 0, g: 0, b: 0, a: 0 } },
      { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
    ],
  } as GradientPaint;
}

function makeCtx(): ConversionContext {
  return {
    assets: [],
    warnings: [],
    assetCounter: 0,
    usedIds: new Set<string>(),
    usedAssetKeys: new Set<string>(),
    cdnPrefix: "",
    exportParity: createExportParityState(),
  };
}

describe("export parity harness", () => {
  it("records zero drops for a supported multi-layer section fixture (regression guard)", async () => {
    const ctx = makeCtx();
    const section = await convertFrameToSection(
      {
        type: "FRAME",
        name: "Page/Test",
        width: 600,
        height: 400,
        x: 0,
        y: 0,
        visible: true,
        fills: [makeLinearGradientPaint(), makeLinearGradientPaint({ blendMode: "MULTIPLY" })],
        strokes: [],
        effects: [],
        layoutMode: "NONE",
        clipsContent: false,
        children: [],
      } as unknown as FrameNode,
      ctx
    );

    accumulateParityFromSectionTree(section, ctx.exportParity!.output);
    const snapshot = buildParityTraceSnapshot(ctx.exportParity!);

    expect(snapshot.dropped).toBe(0);
  });

  it("increments dropped when upstream marks responsive orphan frames", () => {
    const parity = createExportParityState();
    parity.upstream.dropped = 2;
    parity.upstream.dropReasons[EXPORT_DROP_REASON.RESPONSIVE_ORPHAN_FRAME] = 2;
    accumulateParityFromSectionTree({ type: "contentBlock", id: "a", elements: [] }, parity.output);
    const snap = buildParityTraceSnapshot(parity);
    expect(snap.dropped).toBe(2);
    expect(snap.converted).toBe(0);
  });

  it("counts module/global buckets in final ExportResult parity walk", () => {
    const parity = createExportParityState();
    const result = {
      pages: {},
      presets: {},
      modals: {},
      modules: {
        m1: {
          type: "module",
          slots: {
            main: {
              section: {
                definitions: {
                  a: { type: "elementText", id: "a" },
                  b: {
                    type: "elementGroup",
                    id: "b",
                    section: {
                      definitions: {
                        c: {
                          type: "elementText",
                          id: "c",
                          meta: { figma: { fallbackReason: "module-fallback" } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      globals: {
        elements: {
          g1: {
            type: "elementImage",
            id: "g1",
            meta: { figma: { fallbackReason: "global-fallback" } },
          },
        },
      },
    };

    accumulateParityFromExportResult(result, parity.output);
    const snap = buildParityTraceSnapshot(parity);
    expect(snap.converted).toBe(2);
    expect(snap.fallback).toBe(2);
    expect(snap.fallbackReasons).toMatchObject({
      "module-fallback": 1,
      "global-fallback": 1,
    });
  });
});
