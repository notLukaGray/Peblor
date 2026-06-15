import { describe, it, expect } from "vitest";
import { expandPeblor } from "./peblor-expand";
import type { Peblor, SectionBlock } from "@pb/contracts/peblor/core/peblor-schemas";

describe("expandPeblor", () => {
  it("resolves bg when bgKey references a valid background definition", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: [],
      bgKey: "bg",
      definitions: {
        bg: {
          type: "backgroundImage",
          image: "work/default.jpg",
        } as unknown as Peblor["definitions"][string],
      },
    } as Peblor;
    const { bg } = expandPeblor(page);
    expect(bg).not.toBeNull();
    expect((bg as { type?: string }).type).toBe("backgroundImage");
  });

  it("resolves bg as null when bgKey is omitted (no default)", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: [],
      definitions: {},
    } as Peblor;
    const { bg } = expandPeblor(page);
    expect(bg).toBeNull();
  });

  it("throws on invalid entries in sectionOrder", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: ["badType", "valid"],
      definitions: {
        badType: { type: "notASection" } as unknown as Peblor["definitions"][string],
        valid: {
          type: "contentBlock",
          elements: [],
        } as unknown as Peblor["definitions"][string],
      },
      bgKey: undefined,
    };
    expect(() => expandPeblor(page)).toThrow(/sectionOrder/i);
  });

  it("resolves trigger payload URLs when assetBase is provided", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: ["hero"],
      definitions: {
        hero: {
          type: "sectionColumn",
          elements: [],
          onVisible: { type: "setBackground", payload: "heroBg" },
        } as unknown as Peblor["definitions"][string],
        heroBg: {
          type: "backgroundImage",
          image: "work/hero.jpg",
        } as unknown as Peblor["definitions"][string],
      },
      bgKey: undefined,
    };

    const { sections } = expandPeblor(page, { assetBase: "/work" });
    expect(sections).toHaveLength(1);
    const section = sections[0] as SectionBlock;
    expect(section.onVisible?.payload).toBeDefined();
    const payload = section.onVisible!.payload as { type?: string; image?: string };
    expect(payload.type).toBe("backgroundImage");
    expect(payload.image).toContain("/api/media/");
    expect(payload.image).toContain("work");
    expect(payload.image).toContain("hero.jpg");
  });

  it("does not resolve trigger payload URLs when assetBase is omitted", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: ["hero"],
      definitions: {
        hero: {
          type: "sectionColumn",
          elements: [],
          onVisible: { type: "setBackground", payload: "heroBg" },
        } as unknown as Peblor["definitions"][string],
        heroBg: {
          type: "backgroundImage",
          image: "work/hero.jpg",
        } as unknown as Peblor["definitions"][string],
      },
      bgKey: undefined,
    };

    const { sections } = expandPeblor(page);
    expect(sections).toHaveLength(1);
    const section = sections[0] as SectionBlock;
    const payload = section.onVisible!.payload as { type?: string; image?: string };
    expect(payload.image).toBe("work/hero.jpg");
  });

  it("resolves trigger payload URLs with empty assetBase when requested", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: ["hero"],
      definitions: {
        hero: {
          type: "sectionColumn",
          elements: [],
          onVisible: { type: "setBackground", payload: "heroBg" },
        } as unknown as Peblor["definitions"][string],
        heroBg: {
          type: "backgroundImage",
          image: "work/hero.jpg",
        } as unknown as Peblor["definitions"][string],
      },
      bgKey: undefined,
    };

    const { sections } = expandPeblor(page, { assetBase: "" });
    expect(sections).toHaveLength(1);
    const section = sections[0] as SectionBlock;
    const payload = section.onVisible!.payload as { type?: string; image?: string };
    expect(payload.image).toContain("/api/media/");
  });

  it("throws when sectionOrder contains empty keys", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: ["", "hero"],
      definitions: {
        hero: {
          type: "contentBlock",
          elements: [],
        } as unknown as Peblor["definitions"][string],
      },
      bgKey: undefined,
    };
    expect(() => expandPeblor(page)).toThrow(/sectionOrder/i);
  });

  it("inlines the union of base+md elementOrder keys (expand does not filter by viewport)", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: ["hero"],
      definitions: {
        hero: {
          id: "hero",
          type: "contentBlock",
          elementOrder: {
            base: ["mobileEl"],
            md: ["desktopEl"],
          },
        } as unknown as Peblor["definitions"][string],
        mobileEl: {
          type: "heading",
          text: "Mobile",
        } as unknown as Peblor["definitions"][string],
        desktopEl: {
          type: "heading",
          text: "Desktop",
        } as unknown as Peblor["definitions"][string],
      },
      bgKey: undefined,
    };

    const { sections } = expandPeblor(page, {
      breakpoints: { desktop: 1024 },
      viewportWidthPx: 768,
    });
    const section = sections[0] as SectionBlock & { elements?: Array<{ id?: string }> };
    const resolvedIds = (section.elements ?? []).map((element: { id?: string }) => element.id);
    expect(resolvedIds).toEqual(["hero:mobileEl", "hero:desktopEl"]);
  });

  it("inlines the union of md+base elementOrder keys regardless of viewport width", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: ["hero"],
      definitions: {
        hero: {
          id: "hero",
          type: "contentBlock",
          elementOrder: {
            base: ["mobileEl"],
            md: ["desktopEl"],
          },
        } as unknown as Peblor["definitions"][string],
        mobileEl: {
          type: "heading",
          text: "Mobile",
        } as unknown as Peblor["definitions"][string],
        desktopEl: {
          type: "heading",
          text: "Desktop",
        } as unknown as Peblor["definitions"][string],
      },
      bgKey: undefined,
    };

    const { sections } = expandPeblor(page, {
      breakpoints: { desktop: 1024 },
      viewportWidthPx: 1024,
    });
    const section = sections[0] as SectionBlock & { elements?: Array<{ id?: string }> };
    const resolvedIds = (section.elements ?? []).map((element: { id?: string }) => element.id);
    expect(resolvedIds).toEqual(["hero:mobileEl", "hero:desktopEl"]);
  });

  it("produces identical output when called twice on the same definitions object", () => {
    const page: Peblor = {
      slug: "immutability-test",
      title: "Immutability Test",
      sectionOrder: ["hero"],
      bgKey: undefined,
      definitions: {
        hero: {
          id: "hero",
          type: "sectionColumn",
          elementOrder: { base: ["card"], md: ["card"] },
          columnAssignments: { base: { card: 1 }, md: { card: 2 } },
        } as unknown as Peblor["definitions"][string],
        card: {
          id: "card",
          type: "elementGroup",
          module: "cardModule",
          section: {
            elementOrder: ["inner"],
            definitions: {
              inner: { type: "elementBody", text: "Inner" },
            },
          },
        } as unknown as Peblor["definitions"][string],
        cardModule: {
          type: "module",
          slots: {
            default: {
              section: {
                definitions: {
                  heroImage: { type: "elementImage", image: "work/hero.jpg" },
                },
              },
            },
          },
        } as unknown as Peblor["definitions"][string],
      },
    };

    const first = expandPeblor(page);
    const second = expandPeblor(page);
    expect(second).toEqual(first);
  });

  it("injects module configs into nested group elements", () => {
    const page: Peblor = {
      slug: "nested-module-test",
      title: "Nested Module Test",
      sectionOrder: ["hero"],
      bgKey: undefined,
      definitions: {
        hero: {
          id: "hero",
          type: "contentBlock",
          elementOrder: ["player"],
          definitions: {
            player: {
              type: "elementGroup",
              section: {
                elementOrder: ["video"],
                definitions: {
                  video: {
                    type: "elementVideo",
                    module: "video-player",
                    src: "https://example.com/video.mp4",
                    poster: "https://example.com/poster.jpg",
                    objectFit: "cover",
                  },
                },
              },
            },
          },
        } as unknown as Peblor["definitions"][string],
        "video-player": {
          type: "module",
          contextType: "video",
          contentSlot: "main",
          slots: { main: { section: { elementOrder: [], definitions: {} } } },
        } as unknown as Peblor["definitions"][string],
      },
    };

    const { sections } = expandPeblor(page);
    const group = (sections[0] as SectionBlock & { elements?: Array<Record<string, unknown>> })
      .elements?.[0] as { section?: { elements?: Array<Record<string, unknown>> } };
    const video = group.section?.elements?.[0] as { moduleConfig?: { type?: string } };

    expect(video.moduleConfig?.type).toBe("module");
  });
});
