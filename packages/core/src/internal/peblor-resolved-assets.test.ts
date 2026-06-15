import { describe, it, expect } from "vitest";
import {
  normalizeAspectRatioForBunny,
  getBunnyImageParams,
  collectPeblorAssetRefs,
  urlMapKey,
  buildUrlByKeyMap,
  injectResolvedUrlsIntoPage,
} from "./peblor-resolved-assets";
import {
  computeContainerWidthPx,
  createMemoizedComputeContainerWidthPx,
} from "./server/peblor-container-width-server";
import { buildAssetManifest } from "./resolved-assets/peblor-asset-manifest";

describe("peblor-resolved-assets", () => {
  describe("normalizeAspectRatioForBunny", () => {
    it("replaces slash with colon", () => {
      expect(normalizeAspectRatioForBunny("16/9")).toBe("16:9");
      expect(normalizeAspectRatioForBunny("4/3")).toBe("4:3");
    });
    it("returns undefined for empty or invalid", () => {
      expect(normalizeAspectRatioForBunny("")).toBeUndefined();
      expect(normalizeAspectRatioForBunny("   ")).toBeUndefined();
      expect(normalizeAspectRatioForBunny(undefined)).toBeUndefined();
      expect(normalizeAspectRatioForBunny(null as unknown as string)).toBeUndefined();
    });
    it("trims whitespace then converts", () => {
      expect(normalizeAspectRatioForBunny("  16/9  ")).toBe("16:9");
    });
  });

  describe("getBunnyImageParams", () => {
    it("returns width, quality, format for elementImage", () => {
      const out = getBunnyImageParams({ type: "elementImage", width: "400px" }, "image");
      expect(out).toMatchObject({
        width: expect.any(Number),
        quality: expect.any(Number),
        format: expect.any(String),
      });
    });
    it("builds a responsive width ladder for element images", () => {
      const out = getBunnyImageParams({ type: "elementImage", width: "400px" }, "src");
      expect(out.widths).toEqual([200, 400, 600, 800]);
    });
    it("uses containerWidthPx for elementVideo poster with no width", () => {
      const out = getBunnyImageParams({ type: "elementVideo", id: "e1" }, "poster", {
        containerWidthPx: 600,
      });
      expect(out.width).toBe(600);
    });
  });

  describe("collectPeblorAssetRefs", () => {
    it("returns empty array for null bg and empty sections", () => {
      expect(collectPeblorAssetRefs(null, [])).toEqual([]);
    });
    it("collects refs from section with image src", () => {
      const sections = [
        {
          type: "contentBlock",
          elements: [{ type: "elementImage", id: "e1", src: "work/foo.webp" }],
        },
      ];
      const refs = collectPeblorAssetRefs(null, sections as never[]);
      expect(refs).toContain("work/foo.webp");
    });
    it("dedupes refs", () => {
      const sections = [
        {
          type: "contentBlock",
          elements: [
            { type: "elementImage", id: "e1", src: "work/same.webp" },
            { type: "elementImage", id: "e2", src: "work/same.webp" },
          ],
        },
      ];
      const refs = collectPeblorAssetRefs(null, sections as never[]);
      expect(refs.filter((r) => r === "work/same.webp")).toHaveLength(1);
    });
    it("skips absolute URLs and data URLs", () => {
      const sections = [
        {
          type: "contentBlock",
          elements: [
            { type: "elementImage", id: "e1", src: "https://cdn.example.com/x.webp" },
            { type: "elementImage", id: "e2", src: "data:image/webp;base64,abc" },
          ],
        },
      ];
      const refs = collectPeblorAssetRefs(null, sections as never[]);
      expect(refs).not.toContain("https://cdn.example.com/x.webp");
      expect(refs).not.toContain("data:image/webp;base64,abc");
    });
  });

  describe("urlMapKey", () => {
    it("joins ref and blockId with colon", () => {
      expect(urlMapKey("work/a.webp", "block-1")).toBe("work/a.webp:block-1");
    });
  });

  describe("buildUrlByKeyMap", () => {
    it("returns empty object for null bg, empty sections and definitions", () => {
      const fn = () => ({ src: "https://signed/url" });
      expect(buildUrlByKeyMap(null, [], {}, fn)).toEqual({});
    });
    it("builds map for section with image ref", () => {
      const sections = [
        {
          type: "contentBlock",
          elements: [{ type: "elementImage", id: "el1", src: "work/img.webp" }],
        },
      ];
      const resolveImageAsset = (ref: string) => ({ src: `https://cdn/${ref}` });
      const map = buildUrlByKeyMap(null, sections as never[], {}, resolveImageAsset);
      expect(map["work/img.webp:el1"]).toBe("https://cdn/work/img.webp");
    });
  });

  describe("injectResolvedUrlsIntoPage", () => {
    it("returns null resolvedBg for null bg", () => {
      const { resolvedBg, resolvedSections } = injectResolvedUrlsIntoPage(null, [], new Map());
      expect(resolvedBg).toBeNull();
      expect(resolvedSections).toEqual([]);
    });
    it("replaces refs with URLs from urlByRef", () => {
      const sections = [
        {
          type: "contentBlock",
          elements: [{ type: "elementImage", id: "e1", src: "work/pic.webp" }],
        },
      ];
      const urlByRef = new Map<string, string | null>([["work/pic.webp", "https://cdn/pic.webp"]]);
      const { resolvedSections } = injectResolvedUrlsIntoPage(null, sections as never[], urlByRef);
      expect((resolvedSections[0] as { elements: { src: string }[] }).elements[0]?.src).toBe(
        "https://cdn/pic.webp"
      );
    });
    it("passes per-element container context so two image elements in different columns get correct container width", () => {
      const section: Record<string, unknown> = {
        type: "sectionColumn",
        width: "100%",
        contentWidth: "100%",
        columnWidths: [1, 2],
        columnAssignments: { colA: 0, colB: 1 },
        elements: [
          { type: "elementImage", id: "colA", src: "work/a.webp" },
          { type: "elementImage", id: "colB", src: "work/b.webp" },
        ],
      };
      const sections = [section];
      const urlByRef = new Map<string, string | null>([
        ["work/a.webp", "https://cdn/a.webp"],
        ["work/b.webp", "https://cdn/b.webp"],
      ]);
      const containerWidthByElementId: Record<string, number | undefined> = {};
      const resolveImageAsset = (
        ref: string,
        _obj: Record<string, unknown>,
        _key: string,
        context?: { section: unknown; element: { id?: string } }
      ) => {
        if (context) {
          containerWidthByElementId[context.element.id ?? ""] = computeContainerWidthPx(
            context.section as never,
            context.element.id,
            1920
          );
        }
        return { src: urlByRef.get(ref) ?? ref };
      };
      injectResolvedUrlsIntoPage(null, sections as never[], urlByRef, undefined, resolveImageAsset);
      const desktopViewport = 1920;
      const contentAreaPx = desktopViewport;
      const total = 3;
      expect(containerWidthByElementId.colA).toBe(Math.round((contentAreaPx * 1) / total));
      expect(containerWidthByElementId.colB).toBe(Math.round((contentAreaPx * 2) / total));
    });

    it("keeps vw in contentWidth relative to viewport while % remains section-relative", () => {
      const section = {
        type: "contentBlock",
        width: "50%",
        contentWidth: "50vw",
      };
      const computed = computeContainerWidthPx(section as never, undefined, 1920);
      // Desktop viewport is 1920; 50vw should resolve to 960.
      expect(computed).toBe(960);
    });

    it("returns undefined when viewport-relative widths are used without viewport input", () => {
      const section = {
        type: "contentBlock",
        width: "50%",
        contentWidth: "50vw",
      };
      expect(computeContainerWidthPx(section as never, undefined)).toBeUndefined();
    });

    it("supports min/max with 3+ operands in container expression parsing", () => {
      const section = {
        type: "contentBlock",
        width: "100%",
        contentWidth: "min(80vw, 1200px, 60rem)",
      };
      // 80vw on 1920 is 1536; min with 1200 and 960 should resolve to 960.
      expect(computeContainerWidthPx(section as never, undefined, 1920)).toBe(960);
    });

    it("allows percentage widths above 100% for overflowing layouts", () => {
      const section = {
        type: "contentBlock",
        width: "120%",
        contentWidth: "100%",
      };
      expect(computeContainerWidthPx(section as never, undefined, 1000)).toBe(1200);
    });

    it("clamps invalid negative column assignment indices to the first column", () => {
      const section = {
        type: "sectionColumn",
        width: "100%",
        contentWidth: "100%",
        columnWidths: [1, 2],
        columnAssignments: { broken: -1 },
      };
      expect(computeContainerWidthPx(section as never, "broken", 1920)).toBe(640);
    });

    it("memoized width key differentiates full-span and column-scoped elements", () => {
      const memoizedCompute = createMemoizedComputeContainerWidthPx();
      const section = {
        type: "sectionColumn",
        width: "100%",
        contentWidth: "100%",
        columnWidths: [1, 2],
        columnAssignments: { a: 0, b: 1 },
        columnSpan: { b: "all" },
      };
      const forA = memoizedCompute(section as never, "a", 1920);
      const forB = memoizedCompute(section as never, "b", 1920);
      expect(forA).toBe(640);
      expect(forB).toBe(1920);
    });

    it("memoization key follows viewport fallback semantics for unparseable section widths", () => {
      const memoizedCompute = createMemoizedComputeContainerWidthPx();
      const viewportWidthPx = 1200;
      const firstSection = {
        type: "contentBlock",
        width: "auto",
        contentWidth: "50%",
      };
      const secondSection = {
        type: "contentBlock",
        width: "auto",
        contentWidth: "75%",
      };
      const first = memoizedCompute(firstSection as never, undefined, viewportWidthPx);
      const second = memoizedCompute(secondSection as never, undefined, viewportWidthPx);
      expect(first).toBe(600);
      expect(second).toBe(900);
    });
  });

  describe("buildAssetManifest", () => {
    it("returns empty array for empty sections", () => {
      const manifest = buildAssetManifest(null, [], new Map());
      expect(manifest).toEqual([]);
    });

    it("includes image refs with element path", () => {
      const sections = [
        {
          type: "contentBlock" as const,
          elements: [{ type: "elementImage" as const, src: "work/hero.webp" }],
        },
      ];
      const urlMap = new Map<string, string | null>([["work/hero.webp", "https://cdn/hero.webp"]]);
      const manifest = buildAssetManifest(null, sections as never[], urlMap);
      expect(manifest.length).toBeGreaterThan(0);
      const entry = manifest.find((e) => e.key === "work/hero.webp");
      expect(entry).toBeDefined();
      expect(entry!.exists).toBe(true);
    });

    it("surfaces missing CDN key as exists: false", () => {
      const sections = [
        {
          type: "contentBlock" as const,
          elements: [{ type: "elementImage" as const, src: "work/missing.webp" }],
        },
      ];
      const manifest = buildAssetManifest(null, sections as never[], new Map());
      expect(manifest.length).toBeGreaterThan(0);
      const entry = manifest.find((e) => e.key === "work/missing.webp");
      expect(entry).toBeDefined();
      expect(entry!.exists).toBe(false);
    });

    it("includes Lottie .json key in walk", () => {
      const sections = [
        {
          type: "contentBlock" as const,
          elements: [{ type: "elementLottie" as const, src: "animations/loader.json" }],
        },
      ];
      const urlMap = new Map<string, string | null>([
        ["animations/loader.json", "https://cdn/loader.json"],
      ]);
      const manifest = buildAssetManifest(null, sections as never[], urlMap);
      const entry = manifest.find((e) => e.key === "animations/loader.json");
      expect(entry).toBeDefined();
      expect(entry!.exists).toBe(true);
    });

    it("includes Rive .riv key in walk", () => {
      const sections = [
        {
          type: "contentBlock" as const,
          elements: [{ type: "elementRive" as const, src: "animations/icon.riv" }],
        },
      ];
      const urlMap = new Map<string, string | null>([
        ["animations/icon.riv", "https://cdn/icon.riv"],
      ]);
      const manifest = buildAssetManifest(null, sections as never[], urlMap);
      const entry = manifest.find((e) => e.key === "animations/icon.riv");
      expect(entry).toBeDefined();
      expect(entry!.exists).toBe(true);
    });

    it("includes audio sources in walk", () => {
      const sections = [
        {
          type: "contentBlock" as const,
          elements: [
            {
              type: "elementAudio" as const,
              src: "audio/track.m4a",
              sources: [
                { src: "audio/track.mp3", type: "audio/mpeg" },
                { src: "audio/track.ogg", type: "audio/ogg" },
              ],
            },
          ],
        },
      ];
      const urlMap = new Map<string, string | null>([
        ["audio/track.m4a", "https://cdn/track.m4a"],
        ["audio/track.mp3", "https://cdn/track.mp3"],
        ["audio/track.ogg", "https://cdn/track.ogg"],
      ]);
      const manifest = buildAssetManifest(null, sections as never[], urlMap);
      expect(manifest.find((e) => e.key === "audio/track.m4a")).toBeDefined();
      expect(manifest.find((e) => e.key === "audio/track.mp3")).toBeDefined();
      expect(manifest.find((e) => e.key === "audio/track.ogg")).toBeDefined();
    });

    it("includes nested group definitions in walk", () => {
      const sections = [
        {
          type: "contentBlock" as const,
          elements: [
            {
              type: "elementGroup" as const,
              section: {
                definitions: {
                  nested: { type: "elementImage" as const, src: "nested/img.webp" },
                },
              },
            },
          ],
        },
      ];
      const urlMap = new Map<string, string | null>([
        ["nested/img.webp", "https://cdn/nested.webp"],
      ]);
      const manifest = buildAssetManifest(null, sections as never[], urlMap);
      const entry = manifest.find((e) => e.key === "nested/img.webp");
      expect(entry).toBeDefined();
    });

    it("includes reveal section elements in walk", () => {
      const sections = [
        {
          type: "revealSection" as const,
          collapsedElements: [{ type: "elementImage" as const, src: "reveal/collapsed.webp" }],
          revealedElements: [{ type: "elementImage" as const, src: "reveal/revealed.webp" }],
        },
      ];
      const urlMap = new Map<string, string | null>([
        ["reveal/collapsed.webp", "https://cdn/collapsed.webp"],
        ["reveal/revealed.webp", "https://cdn/revealed.webp"],
      ]);
      const manifest = buildAssetManifest(null, sections as never[], urlMap);
      expect(manifest.find((e) => e.key === "reveal/collapsed.webp")).toBeDefined();
      expect(manifest.find((e) => e.key === "reveal/revealed.webp")).toBeDefined();
    });
  });
});
