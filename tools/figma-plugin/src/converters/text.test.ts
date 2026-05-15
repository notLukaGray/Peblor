import { beforeEach, describe, expect, it, vi } from "vitest";
import { convertTextNode } from "./text";

const mixed = Symbol("mixed");

function makeTextNode(overrides: Partial<TextNode> = {}): TextNode {
  return {
    type: "TEXT",
    name: "Heading",
    characters: "Hello world",
    fontName: { family: "Inter", style: "Regular" },
    fontSize: 28,
    fontWeight: 400,
    letterSpacing: { unit: "PERCENT", value: 0 },
    lineHeight: { unit: "AUTO" } as LineHeight,
    textAlignHorizontal: "LEFT",
    textDecoration: "NONE",
    textCase: "ORIGINAL",
    fills: [],
    strokes: [],
    effects: [],
    width: 200,
    height: 64,
    x: 0,
    y: 0,
    visible: true,
    ...overrides,
  } as TextNode;
}

describe("text converter SEO semantics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (
      globalThis as unknown as {
        figma: {
          mixed: symbol;
          getStyleByIdAsync: (id: string) => Promise<null>;
        };
      }
    ).figma = {
      mixed,
      getStyleByIdAsync: vi.fn().mockResolvedValue(null),
    };
  });

  it("preserves visual heading level while exporting seo as semanticLevel", async () => {
    const ctx: {
      assets: never[];
      warnings: string[];
      assetCounter: number;
      usedIds: Set<string>;
      usedAssetKeys: Set<string>;
      cdnPrefix: string;
    } = {
      assets: [],
      warnings: [],
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };
    const result = await convertTextNode(makeTextNode({ name: "Hero [pb: seo=h1]" }), ctx);
    const heading = result as typeof result & { semanticLevel?: number };
    expect(heading.type).toBe("elementHeading");
    expect(heading.level).toBe(1);
    expect(heading.semanticLevel).toBe(1);
    expect(ctx.warnings).toEqual([]);
  });

  it("warns on unsupported seo values and still falls back to heuristics", async () => {
    const ctx: {
      assets: never[];
      warnings: string[];
      assetCounter: number;
      usedIds: Set<string>;
      usedAssetKeys: Set<string>;
      cdnPrefix: string;
    } = {
      assets: [],
      warnings: [],
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };
    const result = await convertTextNode(makeTextNode({ name: "Hero [pb: seo=h9]" }), ctx);
    expect(result.type).toBe("elementHeading");
    expect(result.level).toBe(4);
    expect("semanticLevel" in result).toBe(false);
    expect(ctx.warnings.some((w) => w.includes("unsupported seo value"))).toBe(true);
  });

  it("uses resolved figma text style as semantic fallback when no annotations exist", async () => {
    const ctx = {
      assets: [],
      warnings: [],
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };
    (
      globalThis as unknown as {
        figma: {
          mixed: symbol;
          getStyleByIdAsync: (id: string) => Promise<{ name: string } | null>;
        };
      }
    ).figma.getStyleByIdAsync = vi.fn().mockResolvedValue({ name: "Body2" });

    const result = await convertTextNode(
      makeTextNode({ name: "Paragraph", textStyleId: "style-1" }),
      ctx
    );
    expect(result.type).toBe("elementBody");
    expect(result.level).toBe(2);
    expect(ctx.warnings).toEqual([]);
  });
});
