import { describe, expect, it } from "vitest";
import type { SectionBlock, bgBlock } from "@pb/contracts";
import { injectResolvedUrlsIntoPage } from "./peblor-asset-url-injection";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function makeUrlMap(): Map<string, string | null> {
  return new Map<string, string | null>([
    ["work/hero.webp", "https://cdn.example/work/hero.webp"],
    ["work/hero.mp4", "https://cdn.example/work/hero.mp4"],
    ["work/hero.m3u8", "https://cdn.example/work/hero.m3u8"],
    ["work/group.webp", "https://cdn.example/work/group.webp"],
    ["work/model.glb", "https://cdn.example/work/model.glb"],
    ["work/normal.webp", "https://cdn.example/work/normal.webp"],
  ]);
}

function makeBg(): bgBlock {
  return {
    type: "backgroundTransition",
    from: { type: "backgroundImage", image: "work/hero.webp" },
    to: { type: "backgroundVideo", video: "work/hero.mp4", poster: "work/hero.webp" },
  } as unknown as bgBlock;
}

function makeSections(): SectionBlock[] {
  return [
    {
      type: "contentBlock",
      image: "work/hero.webp",
      elements: [
        {
          type: "elementVideo",
          id: "v1",
          src: "work/hero.mp4",
          sources: [{ src: "work/hero.mp4" }, { src: "work/hero.m3u8" }],
        },
        {
          type: "elementModel3D",
          id: "m1",
          source: "work/model.glb",
          textures: {
            base: { source: "work/hero.webp", normalMap: "work/normal.webp" },
          },
        },
        {
          type: "elementGroup",
          id: "g1",
          section: {
            definitions: {
              child: { type: "elementImage", image: "work/group.webp" },
            },
          },
        },
      ],
    } as unknown as SectionBlock,
  ];
}

describe("injectResolvedUrlsIntoPage immutability", () => {
  it("does not mutate frozen inputs", () => {
    const bg = deepFreeze(makeBg());
    const sections = deepFreeze(makeSections());
    const urlMap = makeUrlMap();

    expect(() => injectResolvedUrlsIntoPage(bg, sections, urlMap)).not.toThrow();
  });

  it("returns deeply equal output across two runs", () => {
    const bg = makeBg();
    const sections = makeSections();

    const first = injectResolvedUrlsIntoPage(
      structuredClone(bg),
      structuredClone(sections),
      makeUrlMap()
    );
    const second = injectResolvedUrlsIntoPage(
      structuredClone(bg),
      structuredClone(sections),
      makeUrlMap()
    );

    expect(second).toEqual(first);
  });

  it("resolves nested model3d texture refs", () => {
    const { resolvedSections } = injectResolvedUrlsIntoPage(makeBg(), makeSections(), makeUrlMap());
    const content = resolvedSections[0] as unknown as {
      elements?: Array<{
        type?: string;
        textures?: { base?: { source?: string; normalMap?: string } };
      }>;
    };
    const model = content.elements?.find((el) => el.type === "elementModel3D");
    expect(model?.textures?.base?.source).toBe("https://cdn.example/work/hero.webp");
  });
});
