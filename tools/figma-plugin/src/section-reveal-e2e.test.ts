import { describe, expect, it } from "vitest";
import { convertFrameToRevealSection } from "./converters/section-reveal";
import type { ConversionContext } from "./types/figma-plugin";

(globalThis as unknown as { figma: { mixed: symbol } }).figma = { mixed: Symbol("mixed") };

function makeCtx(): ConversionContext {
  return {
    assets: [],
    warnings: [],
    assetCounter: 0,
    usedIds: new Set<string>(),
    usedAssetKeys: new Set<string>(),
    cdnPrefix: "",
  };
}

describe("section-reveal end-to-end (real convertNode path)", () => {
  it("preserves non-flatten-safe slot as a single wrapper element with reveal metadata", async () => {
    const ctx = makeCtx();
    const parent = {
      type: "FRAME",
      layoutMode: "VERTICAL",
      paddingLeft: 20,
      paddingRight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      counterAxisAlignItems: "MIN",
      width: 400,
      height: 800,
    } as unknown as FrameNode;

    const section = await convertFrameToRevealSection(
      {
        type: "FRAME",
        name: "Reveal [pb: type=revealSection]",
        parent,
        layoutAlign: "CENTER",
        width: 400,
        height: 600,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "VERTICAL",
        clipsContent: true,
        children: [
          {
            type: "FRAME",
            name: "Header",
            width: 400,
            height: 80,
            x: 0,
            y: 0,
            visible: true,
            fills: [],
            strokes: [],
            effects: [],
            layoutMode: "NONE",
            clipsContent: true,
            children: [
              {
                type: "RECTANGLE",
                name: "Badge",
                width: 40,
                height: 20,
                x: 8,
                y: 8,
                visible: true,
                fills: [],
              },
            ],
          },
          {
            type: "FRAME",
            name: "Revealed",
            width: 400,
            height: 200,
            x: 0,
            y: 80,
            visible: true,
            fills: [],
            strokes: [],
            effects: [],
            layoutMode: "NONE",
            clipsContent: false,
            children: [
              {
                type: "RECTANGLE",
                name: "Body",
                width: 100,
                height: 24,
                x: 0,
                y: 0,
                visible: true,
                fills: [],
              },
            ],
          },
        ],
      } as unknown as FrameNode,
      ctx
    );

    const collapsed = section.collapsedElements as unknown[];
    expect(Array.isArray(collapsed)).toBe(true);
    expect(collapsed.length).toBe(1);
    const slot0 = collapsed[0] as {
      type?: string;
      meta?: { figma?: { inference?: { kind?: string; detail?: string } } };
    };
    expect(slot0.type).toBe("elementGroup");
    expect(slot0.meta?.figma?.inference?.kind).toBe("revealSlotWrapper");
    expect(slot0.meta?.figma?.inference?.detail).toBe("preserved-slot-container");

    expect(section.marginLeft).toBe("20px");
    expect(section.align).toBe("center");
  });

  it("warns when named slots also contain unslotted fallback children", async () => {
    const ctx = makeCtx();
    const section = await convertFrameToRevealSection(
      {
        type: "FRAME",
        name: "Reveal Named Mix [pb: type=revealSection]",
        layoutMode: "VERTICAL",
        clipsContent: true,
        width: 320,
        height: 240,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        children: [
          {
            type: "FRAME",
            name: "Header",
            width: 320,
            height: 40,
            x: 0,
            y: 0,
            visible: true,
            fills: [],
            strokes: [],
            effects: [],
            layoutMode: "NONE",
            clipsContent: false,
            children: [
              {
                type: "RECTANGLE",
                name: "Top Child",
                width: 20,
                height: 20,
                x: 0,
                y: 0,
                visible: true,
                fills: [],
              },
            ],
          },
          {
            type: "FRAME",
            name: "Revealed",
            width: 320,
            height: 120,
            x: 0,
            y: 40,
            visible: true,
            fills: [],
            strokes: [],
            effects: [],
            layoutMode: "NONE",
            clipsContent: false,
            children: [
              {
                type: "RECTANGLE",
                name: "Bottom Child",
                width: 20,
                height: 20,
                x: 0,
                y: 0,
                visible: true,
                fills: [],
              },
            ],
          },
          {
            type: "FRAME",
            name: "Unslotted",
            width: 320,
            height: 60,
            x: 0,
            y: 160,
            visible: true,
            fills: [],
            strokes: [],
            effects: [],
            layoutMode: "NONE",
            clipsContent: false,
            children: [
              {
                type: "RECTANGLE",
                name: "Fallback Child",
                width: 20,
                height: 20,
                x: 0,
                y: 0,
                visible: true,
                fills: [],
              },
            ],
          },
        ],
      } as unknown as FrameNode,
      ctx
    );

    expect(Array.isArray(section.revealedElements)).toBe(true);
    expect((section.revealedElements as unknown[]).length).toBeGreaterThan(0);
    expect(ctx.warnings.some((w) => w.includes("fallback slotting"))).toBe(true);
  });
});
