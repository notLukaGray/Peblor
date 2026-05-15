import { describe, expect, it, vi } from "vitest";
import { convertRichTextNode } from "./node-element-group";
import { parseTextStyle } from "@figma-plugin/helpers";

vi.mock("@figma-plugin/helpers", () => ({
  parseTextStyle: vi.fn(() => [
    {
      characters: "Hello ",
      fontName: { family: "Inter", style: "Regular" },
      textDecoration: "NONE",
    },
    {
      characters: "World",
      fontName: { family: "Inter", style: "Bold Italic" },
      textDecoration: "STRIKETHROUGH",
    },
  ]),
}));

describe("convertRichTextNode", () => {
  it("exports run-level markdown/markup approximations via parseTextStyle", async () => {
    const ctx = {
      assets: [],
      warnings: [] as string[],
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };

    const result = await convertRichTextNode(
      {
        type: "TEXT",
        name: "Mixed Label",
        characters: "Hello World",
        textAlignHorizontal: "RIGHT",
        width: 200,
        height: 32,
        x: 0,
        y: 0,
        visible: true,
      } as unknown as TextNode,
      ctx
    );

    expect(vi.mocked(parseTextStyle)).toHaveBeenCalled();
    expect(result?.type).toBe("elementRichText");
    const rich = result as Record<string, unknown>;
    expect(String(rich.content)).toContain("~~***World***~~");
    expect(String(rich.markup)).toContain("<em>");
    expect(String(rich.markup)).toContain("<s>");
    expect(rich.textAlign).toBe("right");
    expect(ctx.warnings.some((w) => w.includes("run-level formatting approximations"))).toBe(true);
  });

  it("avoids over-escaped punctuation and wraps emphasis per line", async () => {
    vi.mocked(parseTextStyle).mockReturnValueOnce([
      {
        characters: "Designed for Satisfaction\n",
        fontName: { family: "Inter", style: "Bold" },
        textDecoration: "NONE",
      },
      {
        characters: "Using HeatFlow technology.",
        fontName: { family: "Inter", style: "Regular" },
        textDecoration: "NONE",
      },
    ]);

    const ctx = {
      assets: [],
      warnings: [] as string[],
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };

    const result = await convertRichTextNode(
      {
        type: "TEXT",
        name: "Mixed Paragraph",
        characters: "Designed for Satisfaction\nUsing HeatFlow technology.",
        textAlignHorizontal: "LEFT",
        width: 300,
        height: 48,
        x: 0,
        y: 0,
        visible: true,
      } as unknown as TextNode,
      ctx
    );

    const rich = result as Record<string, unknown>;
    expect(String(rich.content)).toContain(
      "**Designed for Satisfaction**\nUsing HeatFlow technology."
    );
    expect(String(rich.content)).not.toContain("\\.");
  });

  it("emits per-run font weights and line-height in rich-text markup", async () => {
    vi.mocked(parseTextStyle).mockReturnValueOnce([
      {
        characters: "Designed for Satisfaction\n",
        fontName: { family: "Inter", style: "Bold" },
        lineHeightPx: 84,
        textDecoration: "NONE",
      },
      {
        characters: "Using HeatFlow technology.",
        fontName: { family: "Inter", style: "Regular" },
        lineHeightPx: 84,
        textDecoration: "NONE",
      },
    ]);

    const ctx = {
      assets: [],
      warnings: [] as string[],
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };

    const result = await convertRichTextNode(
      {
        type: "TEXT",
        name: "Mixed Paragraph",
        characters: "Designed for Satisfaction\nUsing HeatFlow technology.",
        textAlignHorizontal: "LEFT",
        width: 300,
        height: 48,
        x: 0,
        y: 0,
        visible: true,
      } as unknown as TextNode,
      ctx
    );

    const rich = result as Record<string, unknown>;
    const markup = String(rich.markup);
    expect(markup).toContain("<strong>");
    expect(markup).toContain("line-height:84px");
  });
});
