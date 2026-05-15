import { beforeEach, describe, expect, it, vi } from "vitest";

const { seenSizes, seenFrameNames } = vi.hoisted(() => ({
  seenSizes: [] as number[],
  seenFrameNames: [] as string[],
}));

vi.mock("./converters", () => ({
  convertFrameToSection: vi.fn(async (frame: { name?: string }, ctx: { usedIds: Set<string> }) => {
    if ((frame.name ?? "").includes("FAIL")) {
      throw new Error("boom");
    }
    seenSizes.push(ctx.usedIds.size);
    seenFrameNames.push(frame.name ?? "");
    const id = ctx.usedIds.size === 0 ? "hero" : `hero-${ctx.usedIds.size}`;
    ctx.usedIds.add(id);
    return { type: "contentBlock", id, elements: [] };
  }),
}));

vi.mock("./converters/responsive-merge", () => ({
  mergeResponsiveSections: vi.fn((mobile: { id: string }, desktop: { id: string }) => ({
    type: "contentBlock",
    id: `${mobile.id}|${desktop.id}`,
    elements: [],
  })),
}));

import { convertNormalFrames, convertResponsivePairs } from "./main-frame-convert";

(globalThis as unknown as { figma: { ui: { postMessage: (msg: unknown) => void } } }).figma = {
  ui: { postMessage: vi.fn() },
};

function makeCtx() {
  return {
    assets: [],
    warnings: [],
    errors: [],
    info: [],
    assetCounter: 0,
    usedIds: new Set<string>(),
    usedAssetKeys: new Set<string>(),
    cdnPrefix: "",
    skipAssets: false,
  };
}

function makeFrameNode(
  id: string,
  name: string,
  children: SceneNode[] = [],
  overrides: Partial<FrameNode> = {}
): FrameNode {
  return {
    id,
    type: "FRAME",
    name,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    visible: true,
    children,
    ...overrides,
  } as FrameNode;
}

describe("responsive pair conversion", () => {
  beforeEach(() => {
    seenSizes.length = 0;
    seenFrameNames.length = 0;
  });

  it("gives desktop and mobile the same baseline usedIds", async () => {
    const ctx = makeCtx();
    const result = {
      pages: {},
      presets: {},
      modals: {},
      modules: {},
      globals: {},
      assets: [],
      warnings: [],
      elementCount: 0,
    };
    const desktop = { id: "desktop", name: "Section[Desktop]/Hero" } as FrameNode;
    const mobile = { id: "mobile", name: "Section[Mobile]/Hero" } as FrameNode;
    await convertResponsivePairs(
      new Set(["hero"]),
      new Map([["hero", desktop]]),
      new Map([["hero", mobile]]),
      {},
      ctx,
      result
    );

    expect(seenSizes).toEqual([0, 0]);
    expect((result.presets as Record<string, { id: string }>).hero.id).toBe("hero|hero");
    expect(ctx.usedIds.has("hero")).toBe(true);
  });

  it("merges existing and override annotations into one deterministic block", async () => {
    const ctx = makeCtx();
    const result = {
      pages: {},
      presets: {},
      modals: {},
      modules: {},
      globals: {},
      assets: [],
      warnings: [],
      elementCount: 0,
    };

    const frame = {
      id: "frame-1",
      name: "Page/Hero [pb: type=contentBlock, hidden=true]",
    } as FrameNode;

    await convertNormalFrames(
      [frame],
      {},
      { "frame-1": { hidden: "false", fill: "#000000" } },
      {},
      ctx,
      result
    );

    expect(seenFrameNames[0]).toContain(
      "Page/Hero [pb: fill=#000000, hidden=false, type=contentBlock]"
    );
    expect((seenFrameNames[0].match(/\[pb:/g) ?? []).length).toBe(1);
    expect(result.pages).toMatchObject({
      hero: {
        slug: "hero",
        title: "Hero",
        sectionOrder: ["hero"],
      },
    });
  });

  it("records skip override without converting the frame", async () => {
    const ctx = makeCtx();
    const result = {
      pages: {},
      presets: {},
      modals: {},
      modules: {},
      globals: {},
      assets: [],
      warnings: [],
      elementCount: 0,
    };
    const frame = { id: "frame-skip", name: "Page/Skip Me" } as FrameNode;

    await convertNormalFrames([frame], { "frame-skip": "skip" }, {}, {}, ctx, result);

    expect(seenFrameNames).not.toContain("Page/Skip Me");
    expect(ctx.warnings.some((w) => w.includes("skipped by user"))).toBe(true);
  });

  it("warns and skips merge when desktop half fails", async () => {
    const ctx = makeCtx();
    const result = {
      pages: {},
      presets: {},
      modals: {},
      modules: {},
      globals: {},
      assets: [],
      warnings: [],
      elementCount: 0,
    };
    const desktop = { id: "desktop", name: "Section[Desktop]/FAIL Hero" } as FrameNode;
    const mobile = { id: "mobile", name: "Section[Mobile]/Hero" } as FrameNode;

    await convertResponsivePairs(
      new Set(["hero"]),
      new Map([["hero", desktop]]),
      new Map([["hero", mobile]]),
      {},
      ctx,
      result
    );

    expect(result.presets).toEqual({});
    expect(ctx.warnings.some((w) => w.includes("Failed to convert desktop"))).toBe(true);
  });

  it("treats empty annotation overrides as absent for page section splitting", async () => {
    const ctx = makeCtx();
    const result = {
      pages: {},
      presets: {},
      modals: {},
      modules: {},
      globals: {},
      assets: [],
      warnings: [],
      elementCount: 0,
    };
    const sectionA = makeFrameNode("child-1", "Section/Hero");
    const sectionB = makeFrameNode("child-2", "Section/Footer", [], { y: 600 });
    const page = makeFrameNode("page-1", "Page/Landing", [
      sectionA as unknown as SceneNode,
      sectionB as unknown as SceneNode,
    ]);

    await convertNormalFrames([page], {}, { "page-1": {} }, {}, ctx, result);

    expect(seenFrameNames).toContain("Section/Hero");
    expect(seenFrameNames).toContain("Section/Footer");
    expect(seenFrameNames).not.toContain("Page/Landing");
    expect(result.pages).toMatchObject({
      landing: {
        sectionOrder: ["hero", "hero-1"],
      },
    });
  });

  it("keeps explicit Section/* splitting even with non-empty page overrides", async () => {
    const ctx = makeCtx();
    const result = {
      pages: {},
      presets: {},
      modals: {},
      modules: {},
      globals: {},
      assets: [],
      warnings: [],
      elementCount: 0,
    };
    const sectionA = makeFrameNode("child-1", "Section/Hero");
    const page = makeFrameNode("page-1", "Page/Landing", [sectionA as unknown as SceneNode]);

    await convertNormalFrames([page], {}, { "page-1": { fill: "#000000" } }, {}, ctx, result);

    expect(seenFrameNames).toContain("Section/Hero");
    expect(seenFrameNames).not.toContain("Page/Landing [pb: fill=#000000]");
    expect(result.pages).toMatchObject({ landing: { sectionOrder: ["hero"] } });
  });
});
