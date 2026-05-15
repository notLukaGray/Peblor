import { describe, expect, it } from "vitest";
import { convertNode } from "./node-to-element";

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

describe("node-to-element annotations", () => {
  it("maps child layoutAlign to horizontal align for vertical auto-layout parents", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Item [pb: type=spacer]",
        width: 120,
        height: 24,
        x: 0,
        y: 0,
        visible: true,
        layoutAlign: "CENTER",
        parent: { type: "FRAME", layoutMode: "VERTICAL" },
      } as unknown as FrameNode,
      ctx
    );

    const element = result as Record<string, unknown>;
    expect(element.align).toBe("center");
    expect(element.alignY).toBeUndefined();
    expect(element.alignSelf).toBeUndefined();
  });

  it("maps child layoutAlign to vertical alignY for horizontal auto-layout parents", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Item [pb: type=spacer]",
        width: 120,
        height: 24,
        x: 0,
        y: 0,
        visible: true,
        layoutAlign: "MAX",
        parent: { type: "FRAME", layoutMode: "HORIZONTAL" },
      } as unknown as FrameNode,
      ctx
    );

    const element = result as Record<string, unknown>;
    expect(element.alignY).toBe("bottom");
    expect(element.align).toBeUndefined();
    expect(element.alignSelf).toBeUndefined();
  });

  it("preserves stretch alignment safely via wrapperStyle", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Item [pb: type=spacer]",
        width: 120,
        height: 24,
        x: 0,
        y: 0,
        visible: true,
        layoutAlign: "STRETCH",
        parent: { type: "FRAME", layoutMode: "VERTICAL" },
      } as unknown as FrameNode,
      ctx
    );

    const element = result as { alignSelf?: string; wrapperStyle?: Record<string, unknown> };
    expect(element.alignSelf).toBeUndefined();
    expect(element.wrapperStyle?.alignSelf).toBe("stretch");
  });

  it("warns on unsupported annotations without failing conversion", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Spacer [pb: type=spacer, madeup=1]",
        width: 120,
        height: 48,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "NONE",
        children: [],
        clipsContent: false,
      } as unknown as FrameNode,
      ctx
    );

    expect(result?.type).toBe("elementSpacer");
    expect(ctx.warnings.some((w) => w.includes("unsupported annotation key(s): madeup"))).toBe(
      true
    );
  });

  it("infers frame buttons from naming convention without annotation", async () => {
    (globalThis as { figma?: { mixed: symbol } }).figma = { mixed: Symbol("mixed") };
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "btn-primary",
        width: 160,
        height: 44,
        x: 0,
        y: 0,
        visible: true,
        children: [
          {
            type: "TEXT",
            name: "Label",
            characters: "Get Started",
            visible: true,
          },
        ],
      } as unknown as FrameNode,
      ctx
    );

    expect(result?.type).toBe("elementButton");
    expect((result as { label?: string }).label).toBe("Get Started");
    const meta = (result as { meta?: { figma?: { inference?: { kind: string } } } }).meta;
    expect(meta?.figma?.inference?.kind).toBe("elementButton");
  });

  it("emits fallback group for unsupported node types instead of skipping", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "STICKY",
        name: "Sticky Note",
        width: 220,
        height: 120,
        x: 10,
        y: 20,
        visible: true,
      } as unknown as SceneNode,
      ctx
    );

    expect(result?.type).toBe("elementGroup");
    const fallback = result as {
      meta?: { figma?: { fallbackReason?: string } };
      width?: string;
    };
    expect(fallback.meta?.figma?.fallbackReason).toBe("unsupported-node-type");
    expect(fallback.width).toBe("220px");
  });

  it("exports gradient strokes as borderGradient instead of layered background", async () => {
    (globalThis as { figma?: { mixed: symbol } }).figma = { mixed: Symbol("mixed") };
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Card",
        width: 150,
        height: 44,
        x: 0,
        y: 0,
        visible: true,
        fills: [
          {
            type: "SOLID",
            color: { r: 0, g: 0, b: 0 },
            opacity: 0.5,
            visible: true,
          },
        ],
        strokes: [
          {
            type: "GRADIENT_LINEAR",
            visible: true,
            gradientTransform: [
              [1, 0, 0],
              [0, 1, 0],
            ],
            gradientStops: [
              { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
              { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
            ],
          },
        ],
        strokeWeight: 1,
        strokeAlign: "INSIDE",
        effects: [],
        layoutMode: "NONE",
        children: [],
        clipsContent: false,
      } as unknown as FrameNode,
      ctx
    );

    expect(result?.type).toBe("elementGroup");
    const group = result as {
      borderGradient?: { stroke?: string; width?: string };
      wrapperStyle?: Record<string, unknown>;
    };
    expect(group.borderGradient?.stroke).toContain("gradient");
    expect(group.borderGradient?.width).toBe("1px");
    expect(group.wrapperStyle?.backgroundColor).toBe("#00000080");
    expect(group.wrapperStyle?.background).toBeUndefined();
    expect(group.wrapperStyle?.border).toBeUndefined();
  });

  it("prefers getCSSAsync background fallback for complex gradients", async () => {
    (globalThis as { figma?: { mixed: symbol } }).figma = { mixed: Symbol("mixed") };
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Gradient Card",
        width: 200,
        height: 100,
        x: 0,
        y: 0,
        visible: true,
        fills: [
          {
            type: "SOLID",
            color: { r: 1, g: 1, b: 1 },
            opacity: 1,
            visible: true,
          },
        ],
        strokes: [],
        effects: [],
        layoutMode: "NONE",
        children: [],
        clipsContent: false,
        getCSSAsync: async () => ({
          background:
            "linear-gradient(188deg, rgba(0, 0, 0, 0) 30.9%, rgba(0, 0, 0, 0.1) 50.88%, #000 110.83%)",
        }),
      } as unknown as FrameNode,
      ctx
    );

    const group = result as { type: string; wrapperStyle?: Record<string, unknown> };
    expect(group.type).toBe("elementGroup");
    expect(group.wrapperStyle?.background).toBe(
      "linear-gradient(188deg, rgba(0, 0, 0, 0) 30.9%, rgba(0, 0, 0, 0.1) 50.88%, #000 110.83%)"
    );
    expect(group.wrapperStyle?.backgroundColor).toBeUndefined();
  });

  it("uses background (not backgroundColor) for var() fills with gradient fallback", async () => {
    (globalThis as { figma?: { mixed: symbol } }).figma = { mixed: Symbol("mixed") };
    const ctx = makeCtx();
    const bg =
      "var(--GRADIENTS-FRAME-E, linear-gradient(188deg, rgba(0, 0, 0, 0) 30.9%, rgba(0, 0, 0, 0.1) 50.88%, #000 110.83%), radial-gradient(44.5% 44.5% at 0% 55.5%, rgba(130, 76, 30, 0.50) 0%, rgba(96, 57, 24, 0.00) 100%))";
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Gradient Var Card",
        width: 200,
        height: 100,
        x: 0,
        y: 0,
        visible: true,
        fills: [
          {
            type: "SOLID",
            color: { r: 1, g: 1, b: 1 },
            opacity: 1,
            visible: true,
          },
        ],
        strokes: [],
        effects: [],
        layoutMode: "NONE",
        children: [],
        clipsContent: false,
        getCSSAsync: async () => ({
          background: bg,
        }),
      } as unknown as FrameNode,
      ctx
    );

    const group = result as { type: string; wrapperStyle?: Record<string, unknown> };
    expect(group.type).toBe("elementGroup");
    expect(group.wrapperStyle?.background).toBe(bg);
    expect(group.wrapperStyle?.backgroundColor).toBeUndefined();
  });

  it("exports vector-only frames as a single elementSVG to preserve exact alignment", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Top Label Composite",
        width: 370,
        height: 66,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "NONE",
        children: [
          { type: "VECTOR", name: "Vector" },
          { type: "VECTOR", name: "Headline" },
        ],
        clipsContent: false,
        exportAsync: async () =>
          '<svg width="370" height="66" viewBox="0 0 370 66" xmlns="http://www.w3.org/2000/svg"><rect width="370" height="66" rx="8"/></svg>',
      } as unknown as FrameNode,
      ctx
    );

    expect(result?.type).toBe("elementSVG");
    const svg = result as { markup?: string };
    expect(typeof svg.markup).toBe("string");
    expect(svg.markup).toContain("<svg");
    expect(svg.markup).toContain('width="370"');
  });

  it("does not emit extra rotate on elementSVG (rotation baked into exported SVG)", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "VECTOR",
        name: "Play Icon",
        width: 75,
        height: 75,
        x: 0,
        y: 0,
        rotation: -90,
        visible: true,
        exportAsync: async () =>
          '<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg"><path d="M0 0L75 37.5L0 75Z"/></svg>',
      } as unknown as VectorNode,
      ctx
    );

    expect(result?.type).toBe("elementSVG");
    const svg = result as { rotate?: number; markup?: string };
    expect(svg.rotate).toBeUndefined();
    expect(svg.markup).toContain("<svg");
  });

  it("routes mixed-fill text to elementRichText to preserve run-level styling", async () => {
    (globalThis as { figma?: { mixed: symbol } }).figma = { mixed: Symbol("mixed") };
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "TEXT",
        name: "H2 - What folks are saying",
        characters: "What Folks Are Saying",
        width: 320,
        height: 55,
        x: 0,
        y: 0,
        visible: true,
        fontName: { family: "CircularXX", style: "Bold" },
        fontSize: 50,
        textStyleId: "style-id",
        fills: (globalThis as { figma: { mixed: symbol } }).figma.mixed,
        textAlignHorizontal: "CENTER",
      } as unknown as TextNode,
      ctx
    );

    expect(result?.type).toBe("elementRichText");
  });

  it("preserves original oversized crop layer dimensions for clipped auto-layout wrappers", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "RECTANGLE",
        name: "_F8A1374 cropped 1",
        width: 840,
        height: 560,
        x: 0,
        y: -250,
        visible: true,
        parent: { type: "FRAME", width: 610, height: 310 },
        fills: [
          {
            type: "IMAGE",
            visible: true,
            imageHash: "hash-1",
            scaleMode: "CROP",
            imageTransform: [
              [1, 0, 0.01],
              [0, 1, 0.14],
            ],
          },
        ],
      } as unknown as RectangleNode,
      {
        ...ctx,
        skipAssets: true,
      }
    );

    expect(result?.type).toBe("elementImage");
    const image = result as { width?: string; height?: string; objectFit?: string };
    expect(image.width).toBe("840px");
    expect(image.height).toBe("560px");
    expect(image.objectFit).toBe("cover");
  });

  it("exports native GLASS effects on nested frame groups", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Glass Card",
        width: 279,
        height: 155,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [
          {
            type: "GLASS",
            visible: true,
            radius: 24,
            lightIntensity: 0.6,
            lightAngle: 32,
            refraction: 0.7,
            depth: 1.4,
            dispersion: 0.35,
          },
        ],
        layoutMode: "NONE",
        children: [],
        clipsContent: false,
      } as unknown as FrameNode,
      ctx
    );

    expect(result?.type).toBe("elementGroup");
    const group = result as { effects?: Array<Record<string, unknown>> };
    expect(Array.isArray(group.effects)).toBe(true);
    expect(group.effects?.[0]?.type).toBe("glass");
    expect(group.effects?.[0]?.frost).toBe("12px");
    expect(group.effects?.[0]?.refraction).toBe(0.7);
    expect(group.effects?.[0]?.dispersion).toBe(0.35);
  });

  it("keeps backdrop-filter styling without synthesizing glass effects", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Backdrop Card",
        width: 279,
        height: 155,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "NONE",
        children: [],
        clipsContent: false,
        getCSSAsync: async () => ({
          "backdrop-filter": "blur(20px) saturate(160%)",
        }),
      } as unknown as FrameNode,
      ctx
    );

    expect(result?.type).toBe("elementGroup");
    const group = result as {
      effects?: Array<Record<string, unknown>>;
      wrapperStyle?: Record<string, unknown>;
    };
    expect(group.wrapperStyle?.backdropFilter).toBe("blur(20px) saturate(160%)");
    expect(group.wrapperStyle?.WebkitBackdropFilter).toBe("blur(20px) saturate(160%)");
    expect(group.effects).toBeUndefined();
  });

  it("synthesizes glass when backdrop-filter has an explicit glass hint", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "FRAME",
        name: "Frosted Glass Card",
        width: 279,
        height: 155,
        x: 0,
        y: 0,
        visible: true,
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: "NONE",
        children: [],
        clipsContent: false,
        getCSSAsync: async () => ({
          "backdrop-filter": "blur(20px) saturate(160%)",
        }),
      } as unknown as FrameNode,
      ctx
    );

    expect(result?.type).toBe("elementGroup");
    const group = result as {
      effects?: Array<Record<string, unknown>>;
      wrapperStyle?: Record<string, unknown>;
    };
    expect(group.wrapperStyle?.backdropFilter).toBe("blur(20px) saturate(160%)");
    expect(group.wrapperStyle?.WebkitBackdropFilter).toBe("blur(20px) saturate(160%)");
    expect(group.effects?.[0]?.type).toBe("glass");
    expect(group.effects?.[0]?.frost).toBe("20px");
  });

  it("exports backdrop effects on rectangle surfaces (elementSVG) without synthetic glass", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "RECTANGLE",
        name: "Rectangle Surface",
        width: 279,
        height: 155,
        x: 0,
        y: 0,
        visible: true,
        fills: [
          {
            type: "SOLID",
            color: { r: 0.85, g: 0.85, b: 0.85 },
            opacity: 0.2,
            visible: true,
          },
        ],
        effects: [],
        getCSSAsync: async () => ({
          "backdrop-filter": "blur(18px) saturate(140%)",
        }),
        exportAsync: async () =>
          '<svg width="279" height="155" viewBox="0 0 279 155" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="279" height="155" fill="#D9D9D9" fill-opacity="0.2"/></svg>',
      } as unknown as RectangleNode,
      ctx
    );

    expect(result?.type).toBe("elementSVG");
    const svg = result as {
      backdropFilter?: string;
      WebkitBackdropFilter?: string;
      effects?: Array<Record<string, unknown>>;
    };
    expect(svg.backdropFilter).toBe("blur(18px) saturate(140%)");
    expect(svg.WebkitBackdropFilter).toBe("blur(18px) saturate(140%)");
    expect(svg.effects).toBeUndefined();
  });

  it("falls back to exported SVG path data when glass clipPath is missing on STAR nodes", async () => {
    const ctx = makeCtx();
    const result = await convertNode(
      {
        type: "STAR",
        name: "Star 1",
        width: 106,
        height: 101,
        x: 0,
        y: 0,
        visible: true,
        fills: [
          {
            type: "SOLID",
            color: { r: 0, g: 0, b: 0 },
            opacity: 0.01,
            visible: true,
          },
        ],
        effects: [
          {
            type: "GLASS",
            visible: true,
            radius: 11,
            lightIntensity: 0.8,
            lightAngle: -45,
            refraction: 1,
            depth: 33,
            dispersion: 0.5,
          },
        ],
        // Deliberately omit vectorPaths to mimic exports where STAR path metadata
        // is unavailable but SVG export still contains path geometry.
        exportAsync: async () =>
          '<svg width="106" height="101" viewBox="0 0 106 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M52.7837 0L65.2442 38.3496H105.567L72.9453 62.0509L85.4058 100.4L52.7837 76.6991L20.1616 100.4L32.6221 62.0509L5.34058e-05 38.3496H40.3232L52.7837 0Z" fill="black" fill-opacity="0.01"/></svg>',
      } as unknown as StarNode,
      ctx
    );

    expect(result?.type).toBe("elementSVG");
    const svg = result as { effects?: Array<Record<string, unknown>> };
    const glass = svg.effects?.[0];
    expect(glass?.type).toBe("glass");
    expect(typeof glass?.clipPath).toBe("string");
    expect((glass?.clipPath as string).length).toBeGreaterThan(0);
  });
});
