import { describe, expect, it, vi } from "vitest";
import { convertSectionNode } from "./node-section-convert";

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

function makeSectionNode(children: SceneNode[]): SectionNode {
  return {
    type: "SECTION",
    name: "Canvas Section",
    width: 420,
    height: 240,
    x: 12,
    y: 24,
    visible: true,
    children,
  } as unknown as SectionNode;
}

describe("convertSectionNode", () => {
  it("passes SECTION-local parent context to child conversion", async () => {
    const ctx = makeCtx();
    const convertNodeFn = vi
      .fn()
      .mockResolvedValue({ type: "elementSpacer", id: "child-a", height: "10px" });
    const node = makeSectionNode([{ type: "RECTANGLE", name: "Child A" } as unknown as SceneNode]);

    await convertSectionNode(node, ctx, {}, undefined, convertNodeFn);

    expect(convertNodeFn).toHaveBeenCalledTimes(1);
    expect(convertNodeFn.mock.calls[0]?.[2]).toEqual({
      layoutMode: "NONE",
      parentWidth: 420,
      parentHeight: 240,
    });
  });

  it("applies absolute position from parent context and preserves positioning anchor", async () => {
    const ctx = makeCtx();
    const convertNodeFn = vi
      .fn()
      .mockResolvedValue({ type: "elementSpacer", id: "child-a", height: "10px" });
    const node = makeSectionNode([{ type: "RECTANGLE", name: "Child A" } as unknown as SceneNode]);

    const result = await convertSectionNode(
      node,
      ctx,
      {},
      { layoutMode: "NONE", parentWidth: 1000, parentHeight: 1000 },
      convertNodeFn
    );

    expect(result.figmaConstraints).toMatchObject({
      horizontal: "LEFT",
      vertical: "TOP",
      x: 12,
      y: 24,
      width: 420,
      height: 240,
      parentWidth: 1000,
      parentHeight: 1000,
    });
  });

  it("falls back to empty group when section has no children", async () => {
    const ctx = makeCtx();
    const convertNodeFn = vi.fn();
    const node = makeSectionNode([]);

    const result = await convertSectionNode(node, ctx, {}, undefined, convertNodeFn);

    expect(result.type).toBe("elementGroup");
    expect(result.section).toMatchObject({ elementOrder: [], definitions: {} });
    expect(ctx.warnings.some((w) => w.includes("fallback group"))).toBe(true);
    expect(convertNodeFn).not.toHaveBeenCalled();
  });

  it("injects relative wrapper positioning when absent", async () => {
    const ctx = makeCtx();
    const convertNodeFn = vi
      .fn()
      .mockResolvedValue({ type: "elementSpacer", id: "child-a", height: "10px" });
    const node = makeSectionNode([{ type: "RECTANGLE", name: "Child A" } as unknown as SceneNode]);

    const result = await convertSectionNode(node, ctx, {}, undefined, convertNodeFn);
    expect(result.wrapperStyle).toMatchObject({ position: "relative" });
  });
});
