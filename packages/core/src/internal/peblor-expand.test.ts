import { describe, it, expect } from "vitest";
import { expandPeblor } from "./peblor-expand";
import type { Peblor, SectionBlock } from "@pb/contracts/peblor/core/peblor-schemas";

describe("expandPeblor", () => {
  it("uses default bg key when bgKey is omitted", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: [],
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

  it("ignores entries in sectionOrder that are not valid section blocks", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: ["badType", "missing", "valid"],
      definitions: {
        badType: { type: "notASection" } as unknown as Peblor["definitions"][string],
        valid: {
          type: "contentBlock",
          elements: [],
        } as unknown as Peblor["definitions"][string],
      },
      bgKey: "_none",
    };
    const { sections } = expandPeblor(page);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.type).toBe("contentBlock");
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
      bgKey: "_none",
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
      bgKey: "_none",
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
      bgKey: "_none",
    };

    const { sections } = expandPeblor(page, { assetBase: "" });
    expect(sections).toHaveLength(1);
    const section = sections[0] as SectionBlock;
    const payload = section.onVisible!.payload as { type?: string; image?: string };
    expect(payload.image).toContain("/api/media/");
  });

  it("does not throw when sectionOrder contains empty keys", () => {
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
      bgKey: "_none",
    };
    const { sections } = expandPeblor(page);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.type).toBe("contentBlock");
  });

  it("resolves responsive elementOrder.mobile when viewport is below custom desktop breakpoint", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: ["hero"],
      definitions: {
        hero: {
          id: "hero",
          type: "contentBlock",
          elementOrder: {
            mobile: ["mobileEl"],
            desktop: ["desktopEl"],
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
      bgKey: "_none",
    };

    const { sections } = expandPeblor(page, {
      breakpoints: { desktop: 1024 },
      viewportWidthPx: 768,
    });
    const section = sections[0] as SectionBlock & { elements?: Array<{ id?: string }> };
    const resolvedIds = (section.elements ?? []).map((element: { id?: string }) => element.id);
    expect(resolvedIds).toEqual(["hero:desktopEl", "hero:mobileEl"]);
  });

  it("resolves responsive elementOrder.desktop when viewport is at custom desktop breakpoint", () => {
    const page: Peblor = {
      slug: "test",
      title: "Test",
      sectionOrder: ["hero"],
      definitions: {
        hero: {
          id: "hero",
          type: "contentBlock",
          elementOrder: {
            mobile: ["mobileEl"],
            desktop: ["desktopEl"],
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
      bgKey: "_none",
    };

    const { sections } = expandPeblor(page, {
      breakpoints: { desktop: 1024 },
      viewportWidthPx: 1024,
    });
    const section = sections[0] as SectionBlock & { elements?: Array<{ id?: string }> };
    const resolvedIds = (section.elements ?? []).map((element: { id?: string }) => element.id);
    expect(resolvedIds).toEqual(["hero:desktopEl", "hero:mobileEl"]);
  });

  it("produces identical output when called twice on the same definitions object", () => {
    const page: Peblor = {
      slug: "immutability-test",
      title: "Immutability Test",
      sectionOrder: ["hero"],
      bgKey: "_none",
      definitions: {
        hero: {
          id: "hero",
          type: "sectionColumn",
          elementOrder: { mobile: ["card"], desktop: ["card"] },
          columnAssignments: { mobile: { card: 1 }, desktop: { card: 2 } },
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
});
