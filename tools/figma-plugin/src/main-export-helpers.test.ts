import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  applyFrameToResult,
  buildExportTrace,
  countElementsInResult,
  quickScanFrame,
} from "./main-export-helpers";

function makeFrame(overrides: Partial<FrameNode> = {}): FrameNode {
  return {
    type: "FRAME",
    name: "Section/Example",
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    visible: true,
    layoutMode: "NONE",
    clipsContent: false,
    fills: [],
    strokes: [],
    effects: [],
    children: [],
    ...overrides,
  } as FrameNode;
}

function readFixtureJson<T>(name: string): T {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const fixturePath = path.join(currentDir, "__fixtures__", name);
  return JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as T;
}

describe("export helper diagnostics", () => {
  it("categorizes preflight issues and builds trace counts from warnings", () => {
    const frame = makeFrame({
      name: "Section/Example [pb: type=sectionColumn, madeup=1]",
      children: [
        {
          type: "FRAME",
          name: "Collapsed slot",
          width: 120,
          height: 80,
          visible: true,
          children: [],
        } as unknown as SceneNode,
        {
          type: "FRAME",
          name: "Frame 1",
          width: 120,
          height: 80,
          visible: true,
          children: [],
        } as unknown as SceneNode,
        {
          type: "FRAME",
          name: "Frame 2",
          width: 120,
          height: 80,
          visible: true,
          children: [],
        } as unknown as SceneNode,
      ],
    });

    const issues = quickScanFrame(frame);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "warn", category: "annotations" }),
        expect.objectContaining({ severity: "warn", category: "structure" }),
        expect.objectContaining({ severity: "warn", category: "slots" }),
        expect.objectContaining({ severity: "info", category: "naming" }),
      ])
    );

    const trace = buildExportTrace(
      [{ id: "frame-1", name: frame.name, issues }],
      [
        '[preflight:annotations] "Section/Example": unsupported annotation key(s): madeup',
        '[preflight:slots] "Section/Example": "Collapsed slot" is an empty slot/container',
        "[error] hard failure",
        "[info] docs note",
      ]
    );

    expect(trace.counts.severity).toEqual({ error: 1, warn: 2, info: 1 });
    expect(trace.counts.parity).toBeUndefined();
    expect(trace.counts.category).toMatchObject({
      "preflight:annotations": 1,
      "preflight:slots": 1,
      error: 1,
      info: 1,
    });
    expect(trace.frames[0]).toMatchObject({
      id: "frame-1",
      name: frame.name,
      issues: expect.arrayContaining([
        expect.objectContaining({
          frameId: "frame-1",
          frameName: frame.name,
          severity: "warn",
          category: "annotations",
        }),
      ]),
    });
  });

  it("writes page exports in sectionOrder+definitions shape and counts reveal elements", () => {
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
    const ctx = {
      assets: [],
      warnings: [] as string[],
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };
    const frame = { name: "Page/Home" } as unknown as FrameNode;
    const target = { type: "page", key: "home", label: "Home" } as const;

    applyFrameToResult(
      frame,
      target,
      {
        type: "contentBlock",
        id: "hero",
        elements: [{ type: "elementBody", id: "copy", text: "Hello" }],
      },
      result,
      ctx
    );
    applyFrameToResult(
      frame,
      target,
      {
        type: "revealSection",
        id: "faq",
        collapsedElements: [{ type: "elementHeading", id: "q", text: "Q", level: 3 }],
        revealedElements: [{ type: "elementBody", id: "a", text: "A" }],
      },
      result,
      ctx
    );

    expect(result.pages).toMatchObject({
      home: {
        slug: "home",
        title: "Home",
        sectionOrder: ["hero", "faq"],
        definitions: {
          hero: expect.objectContaining({ type: "contentBlock" }),
          faq: expect.objectContaining({ type: "revealSection" }),
        },
      },
    });
    const home = (result.pages as Record<string, unknown>).home as Record<string, unknown>;
    expect(home).not.toHaveProperty("sections");

    expect(
      countElementsInResult(result as unknown as Parameters<typeof countElementsInResult>[0])
    ).toBe(3);
  });

  it("inlines auto-generated presets onto page exports so preset refs resolve in page-only flows", () => {
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
    const ctx = {
      assets: [],
      warnings: [] as string[],
      autoPresets: true,
      usedPresetKeys: new Set<string>(),
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };
    const frame = { name: "Page/Test" } as unknown as FrameNode;
    const target = { type: "page", key: "test", label: "Test" } as const;

    applyFrameToResult(
      frame,
      target,
      {
        type: "contentBlock",
        id: "hero",
        elements: [
          {
            type: "elementGroup",
            id: "root",
            section: {
              elementOrder: ["buttondark", "buttondark-2"],
              definitions: {
                buttondark: {
                  type: "elementGroup",
                  id: "buttondark",
                  interactions: {
                    onClick: { type: "navigate", payload: { href: "https://example.com" } },
                  },
                  section: {
                    elementOrder: ["label"],
                    definitions: {
                      label: { type: "elementBody", id: "label", text: "BUTTON" },
                    },
                  },
                },
                "buttondark-2": {
                  type: "elementGroup",
                  id: "buttondark-2",
                  interactions: {
                    onClick: { type: "navigate", payload: { href: "https://example.com" } },
                  },
                  section: {
                    elementOrder: ["label-2"],
                    definitions: {
                      "label-2": { type: "elementBody", id: "label-2", text: "BUTTON" },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      result,
      ctx
    );

    const page = (result.pages as Record<string, unknown>).test as Record<string, unknown>;
    const pagePreset = page.preset as Record<string, unknown>;
    expect(pagePreset).toBeTruthy();
    expect(pagePreset.buttondark).toEqual(
      expect.objectContaining({
        type: "elementGroup",
        id: "buttondark",
      })
    );

    const defs = page.definitions as Record<string, unknown>;
    const hero = defs.hero as Record<string, unknown>;
    const heroElements = hero.elements as Array<Record<string, unknown>>;
    const root = heroElements[0];
    const rootDefs = ((root.section as Record<string, unknown>).definitions ?? {}) as Record<
      string,
      unknown
    >;
    expect(rootDefs.buttondark).toEqual({ preset: "buttondark", id: "buttondark" });
  });

  it("keeps canonical sectionOrder+definitions and does not emit sections mirror", () => {
    const result = {
      pages: {
        home: {
          slug: "home",
          title: "Home",
          sectionOrder: ["hero"],
          definitions: {
            hero: { type: "contentBlock", id: "hero", elements: [] },
          },
          sections: [{ type: "contentBlock", id: "stale", elements: [] }],
        },
      },
      presets: {},
      modals: {},
      modules: {},
      globals: {},
      assets: [],
      warnings: [],
      elementCount: 0,
    };
    const ctx = {
      assets: [],
      warnings: [] as string[],
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };

    applyFrameToResult(
      { name: "Page/Home" } as unknown as FrameNode,
      { type: "page", key: "home", label: "Home" },
      { type: "contentBlock", id: "faq", elements: [] },
      result,
      ctx
    );

    const page = (result.pages as Record<string, unknown>).home as Record<string, unknown>;
    const sectionOrder = page.sectionOrder as string[];
    const definitions = page.definitions as Record<string, unknown>;
    expect(sectionOrder).toEqual(["hero", "faq"]);
    expect(definitions.hero).toEqual(expect.objectContaining({ id: "hero" }));
    expect(definitions.faq).toEqual(expect.objectContaining({ id: "faq" }));
    expect(page).not.toHaveProperty("sections");
  });

  it("dedupes duplicate explicit section ids without overwriting existing definitions", () => {
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
    const ctx = {
      assets: [],
      warnings: [] as string[],
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };
    const frame = { name: "Page/Home" } as unknown as FrameNode;
    const target = { type: "page", key: "home", label: "Home" } as const;

    applyFrameToResult(
      frame,
      target,
      { type: "contentBlock", id: "hero", elements: [] },
      result,
      ctx
    );
    applyFrameToResult(
      frame,
      target,
      { type: "contentBlock", id: "hero", elements: [] },
      result,
      ctx
    );

    const home = (result.pages as Record<string, unknown>).home as Record<string, unknown>;
    expect(home.sectionOrder).toEqual(["hero", "hero-2"]);
    expect(Object.keys(home.definitions as Record<string, unknown>)).toEqual(["hero", "hero-2"]);
    expect(ctx.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('produced duplicate section id "hero"'),
        expect.stringContaining('Using "hero-2" instead.'),
      ])
    );
  });

  it("fixture: preserves instance override content and motion-rich button structure without false preset promotion", () => {
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
    const ctx = {
      assets: [],
      warnings: [] as string[],
      autoPresets: true,
      usedPresetKeys: new Set<string>(),
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };
    const fixtureSection = readFixtureJson<Record<string, unknown>>(
      "button-instance-override-section.json"
    );

    applyFrameToResult(
      { name: "Page/Test" } as unknown as FrameNode,
      { type: "page", key: "test", label: "Test" },
      fixtureSection,
      result,
      ctx
    );

    // Text override should survive in second instance branch.
    const page = (result.pages as Record<string, unknown>).test as Record<string, unknown>;
    const pageDefs = page.definitions as Record<string, unknown>;
    const pagetest = pageDefs.pagetest as Record<string, unknown>;
    const pageRoot = (pagetest.elements as Array<Record<string, unknown>>)[0];
    const rootDefs = ((pageRoot.section as Record<string, unknown>).definitions ?? {}) as Record<
      string,
      unknown
    >;
    const buttonTwo = rootDefs["buttondark-2"] as Record<string, unknown>;
    const buttonTwoDefaultDefs = (
      ((buttonTwo.section as Record<string, unknown>).definitions ?? {}) as Record<string, unknown>
    )["buttondark-2--default"] as Record<string, unknown>;
    const internalDefs = ((buttonTwoDefaultDefs.section as Record<string, unknown>).definitions ??
      {}) as Record<string, unknown>;
    const internal = internalDefs["internalframe-2"] as Record<string, unknown>;
    const textDefs = ((internal.section as Record<string, unknown>).definitions ?? {}) as Record<
      string,
      unknown
    >;
    expect((textDefs["text-2"] as Record<string, unknown>).text).toBe("TWO");

    // Motion-rich inner style should remain present.
    expect((internal.motion as Record<string, unknown>).whileHover).toEqual({
      backgroundColor: "#3f3f3f80",
    });

    // Distinct nested content should prevent auto-preset collapse for this fixture.
    expect(Object.keys(result.presets)).toEqual([]);
  });

  it("exports modal and module targets in runtime-friendly contract shapes", () => {
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
    const ctx = {
      assets: [],
      warnings: [] as string[],
      assetCounter: 0,
      usedIds: new Set<string>(),
      usedAssetKeys: new Set<string>(),
      cdnPrefix: "",
    };
    const frame = { name: "Modal/Contact" } as unknown as FrameNode;

    applyFrameToResult(
      frame,
      { type: "modal", key: "contact", label: "Contact" },
      { type: "contentBlock", id: "intro", elements: [] },
      result,
      ctx
    );
    applyFrameToResult(
      frame,
      { type: "modal", key: "contact", label: "Contact" },
      { type: "contentBlock", id: "form", elements: [] },
      result,
      ctx
    );

    expect(result.modals).toMatchObject({
      contact: {
        id: "contact",
        title: "Contact",
        sectionOrder: ["intro", "form"],
        definitions: {
          intro: expect.objectContaining({ type: "contentBlock" }),
          form: expect.objectContaining({ type: "contentBlock" }),
        },
      },
    });

    applyFrameToResult(
      { name: "Module/Video Controls" } as unknown as FrameNode,
      { type: "module", key: "video-controls", label: "Video Controls" },
      {
        type: "contentBlock",
        id: "module-section",
        elements: [
          { type: "elementButton", id: "play", label: "Play" },
          { type: "elementButton", id: "pause", label: "Pause" },
        ],
      },
      result,
      ctx
    );

    applyFrameToResult(
      { name: "Module/Video Player" } as unknown as FrameNode,
      { type: "module", key: "video-player", label: "Video Player" },
      {
        type: "contentBlock",
        id: "player-shell",
        elements: [
          { type: "elementVideo", id: "hero-video", src: "hero.mp4" },
          {
            type: "elementGroup",
            id: "bottom-bar",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            wrapperStyle: {
              position: "absolute",
              left: "10px",
              right: "10px",
              bottom: "10px",
              background: "rgba(0,0,0,0.6)",
              borderRadius: "9999px",
            },
            section: {
              elementOrder: ["play"],
              definitions: {
                play: { type: "elementButton", id: "play", label: "Play" },
              },
            },
          },
        ],
      },
      result,
      ctx
    );

    expect(result.modules).toMatchObject({
      "video-controls": {
        type: "module",
        contentSlot: "main",
        slots: {
          main: {
            section: {
              elementOrder: ["play", "pause"],
              definitions: {
                play: expect.objectContaining({ type: "elementButton" }),
                pause: expect.objectContaining({ type: "elementButton" }),
              },
            },
          },
        },
      },
      "video-player": {
        type: "module",
        contentSlot: "main",
        slots: {
          main: {
            section: {
              elementOrder: ["hero-video"],
              definitions: {
                "hero-video": expect.objectContaining({ type: "elementVideo" }),
              },
            },
          },
          bottomBar: {
            position: "absolute",
            left: "10px",
            right: "10px",
            bottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            style: {
              background: "rgba(0,0,0,0.6)",
              borderRadius: "9999px",
            },
            section: {
              elementOrder: ["play"],
              definitions: {
                play: expect.objectContaining({ type: "elementButton" }),
              },
            },
          },
        },
      },
    });
  });
});
