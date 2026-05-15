import { describe, expect, it, vi } from "vitest";

vi.mock("./node-to-element", () => ({
  convertNode: vi.fn(async (node: { name?: string }) => ({
    type: "elementSpacer",
    id: String(node.name ?? "child")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-"),
    height: "10px",
  })),
}));

import { convertFrameToRevealSection } from "./section-reveal";
import { convertFrameToColumnSection } from "./section-column-convert";
import { convertFrameToSection } from "./node-to-section";
import { convertNode } from "./node-to-element";

(globalThis as unknown as { figma: { mixed: symbol } }).figma = { mixed: Symbol("mixed") };

function makeCtx(): {
  assets: never[];
  warnings: string[];
  assetCounter: number;
  usedIds: Set<string>;
  usedAssetKeys: Set<string>;
  cdnPrefix: string;
} {
  return {
    assets: [],
    warnings: [],
    assetCounter: 0,
    usedIds: new Set<string>(),
    usedAssetKeys: new Set<string>(),
    cdnPrefix: "",
  };
}

function makeLinearGradientPaint(overrides: Partial<GradientPaint> = {}): GradientPaint {
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
    ...overrides,
  } as GradientPaint;
}

describe("section fallback slotting", () => {
  it("keeps unslotted reveal children in revealedElements", async () => {
    const ctx = makeCtx();
    const section = await convertFrameToRevealSection(
      {
        type: "FRAME",
        name: "Reveal [pb: type=revealSection]",
        width: 600,
        height: 400,
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
            type: "FRAME",
            name: "Header",
            width: 200,
            height: 80,
            x: 0,
            y: 0,
            visible: true,
            children: [{ type: "RECTANGLE", name: "Slot child", width: 20, height: 20 }],
          },
          { type: "RECTANGLE", name: "Loose child", width: 20, height: 20 },
        ],
      } as unknown as FrameNode,
      ctx
    );

    expect(
      (section.revealedElements as unknown[]).map((el) => (el as { id?: string }).id)
    ).toContain("loose-child");
    expect(ctx.warnings.some((w) => w.includes("fallback slotting"))).toBe(true);
  });

  it("keeps loose column children and assigns them to the nearest column", async () => {
    const ctx = makeCtx();
    const section = await convertFrameToColumnSection(
      {
        type: "FRAME",
        name: "Columns",
        width: 800,
        height: 400,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "HORIZONTAL",
        clipsContent: false,
        children: [
          {
            type: "FRAME",
            name: "Column 1",
            width: 100,
            height: 400,
            x: 0,
            y: 0,
            visible: true,
            children: [{ type: "RECTANGLE", name: "Left item", width: 20, height: 20 }],
          },
          {
            type: "FRAME",
            name: "Column 2",
            width: 100,
            height: 400,
            x: 300,
            y: 0,
            visible: true,
            children: [{ type: "RECTANGLE", name: "Right item", width: 20, height: 20 }],
          },
          { type: "RECTANGLE", name: "Loose item", width: 20, height: 20, x: 320, y: 20 },
        ],
      } as unknown as FrameNode,
      ctx
    );

    const assignments = section.columnAssignments as Record<string, number>;
    const elementIds = (section.elements as Array<{ id?: string }>).map((el) => el.id);
    expect(elementIds).toEqual(expect.arrayContaining(["left-item", "right-item", "loose-item"]));
    expect(assignments["left-item"]).toBe(0);
    expect(assignments["right-item"]).toBe(1);
    expect(assignments["loose-item"]).toBe(1);
  });

  it("exports stacked section fills as layers so multi-gradient backgrounds are preserved", async () => {
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
        fills: [
          makeLinearGradientPaint({
            gradientStops: [
              { position: 0, color: { r: 0.65, g: 0.5, b: 0.27, a: 1 } },
              { position: 1, color: { r: 0.02, g: 0.02, b: 0.01, a: 1 } },
            ],
          }),
          makeLinearGradientPaint({
            blendMode: "MULTIPLY",
            opacity: 0.5,
            gradientStops: [
              { position: 0, color: { r: 0, g: 0, b: 0, a: 0 } },
              { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
            ],
          }),
        ],
        strokes: [],
        effects: [],
        layoutMode: "NONE",
        clipsContent: false,
        children: [],
      } as unknown as FrameNode,
      ctx
    );

    const rec = section as unknown as Record<string, unknown>;
    const layers = rec.layers as Array<Record<string, unknown>>;
    expect(Array.isArray(layers)).toBe(true);
    expect(layers).toHaveLength(2);
    expect(layers[0].fill).toContain("linear-gradient");
    expect(layers[1].blendMode).toBe("multiply");
    expect(rec.fill).toBeUndefined();
  });

  it("drops inferred layers when [pb: fill=...] override is provided", async () => {
    const ctx = makeCtx();
    const section = await convertFrameToSection(
      {
        type: "FRAME",
        name: "Page/Test [pb: fill=#123456]",
        width: 600,
        height: 400,
        x: 0,
        y: 0,
        visible: true,
        fills: [makeLinearGradientPaint(), makeLinearGradientPaint({ blendMode: "OVERLAY" })],
        strokes: [],
        effects: [],
        layoutMode: "NONE",
        clipsContent: false,
        children: [],
      } as unknown as FrameNode,
      ctx
    );

    const rec2 = section as unknown as Record<string, unknown>;
    expect(rec2.fill).toBe("#123456");
    expect(rec2.layers).toBeUndefined();
  });

  it("preserves negative horizontal auto-layout spacing as column overlap gap", async () => {
    const ctx = makeCtx();
    const section = await convertFrameToColumnSection(
      {
        type: "FRAME",
        name: "Columns overlap",
        width: 800,
        height: 240,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "HORIZONTAL",
        itemSpacing: -40,
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "MIN",
        clipsContent: false,
        children: [
          {
            type: "FRAME",
            name: "Column 1",
            width: 300,
            height: 240,
            x: 0,
            y: 0,
            visible: true,
            children: [{ type: "RECTANGLE", name: "Left", width: 20, height: 20 }],
          },
          {
            type: "FRAME",
            name: "Column 2",
            width: 300,
            height: 240,
            x: 260,
            y: 0,
            visible: true,
            children: [{ type: "RECTANGLE", name: "Right", width: 20, height: 20 }],
          },
        ],
      } as unknown as FrameNode,
      ctx
    );

    expect((section as Record<string, unknown>).columnGaps).toBe("-40px");
  });

  it("exports explicit column wrapper alignment into columnStyles", async () => {
    const ctx = makeCtx();
    const section = await convertFrameToColumnSection(
      {
        type: "FRAME",
        name: "Columns aligned",
        width: 800,
        height: 240,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "HORIZONTAL",
        itemSpacing: 24,
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "MIN",
        clipsContent: false,
        children: [
          {
            type: "FRAME",
            name: "Column 1",
            width: 300,
            height: 240,
            x: 0,
            y: 0,
            visible: true,
            layoutMode: "VERTICAL",
            itemSpacing: 12,
            primaryAxisAlignItems: "CENTER",
            counterAxisAlignItems: "MAX",
            paddingTop: 8,
            paddingRight: 12,
            paddingBottom: 8,
            paddingLeft: 12,
            clipsContent: true,
            fills: [],
            effects: [],
            children: [
              { type: "RECTANGLE", name: "Left", width: 20, height: 20 },
              { type: "RECTANGLE", name: "Left 2", width: 20, height: 20 },
            ],
          },
          {
            type: "FRAME",
            name: "Column 2",
            width: 300,
            height: 240,
            x: 324,
            y: 0,
            visible: true,
            layoutMode: "VERTICAL",
            itemSpacing: 0,
            primaryAxisAlignItems: "MIN",
            counterAxisAlignItems: "CENTER",
            clipsContent: false,
            fills: [],
            effects: [],
            children: [{ type: "RECTANGLE", name: "Right", width: 20, height: 20 }],
          },
        ],
      } as unknown as FrameNode,
      ctx
    );

    const styles = (section as Record<string, unknown>).columnStyles as Array<
      Record<string, unknown>
    >;
    expect(Array.isArray(styles)).toBe(true);
    expect(styles[0]?.justifyContent).toBe("center");
    expect(styles[0]?.alignItems).toBe("flex-end");
    expect(styles[0]?.gap).toBe("12px");
    expect(styles[0]?.padding).toBe("8px 12px 8px 12px");
    expect(styles[0]?.overflow).toBe("hidden");
  });

  it("maps section auto-layout padding to section margin fields for sectionColumn", async () => {
    const ctx = makeCtx();
    const section = await convertFrameToColumnSection(
      {
        type: "FRAME",
        name: "Columns padded",
        width: 396,
        height: 341,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "HORIZONTAL",
        itemSpacing: -200,
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "MIN",
        paddingTop: 10,
        paddingRight: 10,
        paddingBottom: 10,
        paddingLeft: 10,
        clipsContent: false,
        children: [
          {
            type: "TEXT",
            name: "Text",
            width: 100,
            height: 20,
            x: 0,
            y: 0,
            visible: true,
          },
          {
            type: "RECTANGLE",
            name: "Rectangle 2",
            width: 300,
            height: 150,
            x: 100,
            y: 0,
            visible: true,
          },
        ],
      } as unknown as FrameNode,
      ctx
    );

    const sectionRecord = section as Record<string, unknown>;
    expect(sectionRecord.marginTop).toBe("10px");
    expect(sectionRecord.marginRight).toBe("10px");
    expect(sectionRecord.marginBottom).toBe("10px");
    expect(sectionRecord.marginLeft).toBe("10px");
    expect(sectionRecord.padding).toBeUndefined();
    expect(sectionRecord.paddingTop).toBeUndefined();
  });

  it("keeps zero edge values when synthesizing sectionColumn child padding shorthand", async () => {
    const ctx = makeCtx();
    const section = await convertFrameToColumnSection(
      {
        type: "FRAME",
        name: "Columns zero edge",
        width: 800,
        height: 240,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "HORIZONTAL",
        itemSpacing: 24,
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "MIN",
        clipsContent: false,
        children: [
          {
            type: "FRAME",
            name: "Column 1",
            width: 300,
            height: 240,
            x: 0,
            y: 0,
            visible: true,
            layoutMode: "VERTICAL",
            itemSpacing: 0,
            primaryAxisAlignItems: "MIN",
            counterAxisAlignItems: "MIN",
            paddingTop: 8,
            paddingRight: 12,
            paddingBottom: 8,
            paddingLeft: 0,
            clipsContent: false,
            fills: [],
            effects: [],
            children: [{ type: "RECTANGLE", name: "Left", width: 20, height: 20 }],
          },
        ],
      } as unknown as FrameNode,
      ctx
    );
    const styles = (section as Record<string, unknown>).columnStyles as Array<
      Record<string, unknown>
    >;
    expect(styles[0]?.padding).toBe("8px 12px 8px 0px");
  });

  it("passes column-wrapper parent context to nested child conversion", async () => {
    vi.mocked(convertNode).mockClear();
    const ctx = makeCtx();
    await convertFrameToColumnSection(
      {
        type: "FRAME",
        name: "Columns context",
        width: 800,
        height: 240,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "HORIZONTAL",
        itemSpacing: 24,
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "MIN",
        clipsContent: false,
        children: [
          {
            type: "FRAME",
            name: "Column 1",
            width: 300,
            height: 240,
            x: 0,
            y: 0,
            visible: true,
            layoutMode: "VERTICAL",
            itemSpacing: 8,
            primaryAxisAlignItems: "MIN",
            counterAxisAlignItems: "MIN",
            clipsContent: false,
            fills: [],
            effects: [],
            children: [{ type: "RECTANGLE", name: "Nested", width: 20, height: 20 }],
          },
        ],
      } as unknown as FrameNode,
      ctx
    );

    const nestedCall = vi
      .mocked(convertNode)
      .mock.calls.find((call) => (call[0] as { name?: string }).name === "Nested");
    expect(nestedCall?.[2]).toEqual({
      layoutMode: "VERTICAL",
      parentWidth: 300,
      parentHeight: 240,
    });
  });

  it("wraps auto-layout contentBlock even without padding to preserve layout semantics", async () => {
    const ctx = makeCtx();
    const section = await convertFrameToSection(
      {
        type: "FRAME",
        name: "Auto layout no padding [pb: type=contentBlock]",
        width: 480,
        height: 260,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "VERTICAL",
        itemSpacing: 16,
        primaryAxisAlignItems: "SPACE_BETWEEN",
        counterAxisAlignItems: "CENTER",
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        clipsContent: false,
        children: [
          { type: "RECTANGLE", name: "Item A", width: 40, height: 20, x: 0, y: 0, visible: true },
          {
            type: "RECTANGLE",
            name: "Item B",
            width: 40,
            height: 20,
            x: 0,
            y: 36,
            visible: true,
          },
        ],
      } as unknown as FrameNode,
      ctx
    );

    const sectionRecord = section as Record<string, unknown>;
    const wrappers = sectionRecord.elements as Array<Record<string, unknown>>;
    expect(Array.isArray(wrappers)).toBe(true);
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]?.type).toBe("elementGroup");
    expect(wrappers[0]?.display).toBe("flex");
    expect(wrappers[0]?.justifyContent).toBe("space-between");
    expect(wrappers[0]?.gap).toBe("16px");
  });
});
