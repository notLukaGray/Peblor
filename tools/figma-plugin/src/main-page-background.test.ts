import { describe, expect, it } from "vitest";
import { promotePageBackgroundFromSection } from "./main-page-background";
import type { ConversionContext } from "./types/figma-plugin";

function makeCtx(): ConversionContext {
  return {
    assets: [],
    warnings: [],
    assetCounter: 0,
    usedIds: new Set<string>(),
    usedAssetKeys: new Set<string>(),
    cdnPrefix: "",
  };
}

describe("promotePageBackgroundFromSection", () => {
  it("promotes first section background and keeps section when it has elements", () => {
    const page = {
      slug: "case-study",
      sectionOrder: [],
      definitions: {},
    };
    const section = {
      type: "contentBlock",
      fill: "#111111",
      elements: [{ type: "elementHeading", text: "Hello" }],
    } as Record<string, unknown>;
    const ctx = makeCtx();

    const result = promotePageBackgroundFromSection({
      page,
      section,
      sectionId: "hero",
      frameName: "Page/Case Study",
      ctx,
    });

    expect(result).toEqual({ promoted: true, dropSection: false });
    expect(page.bgKey).toBe("hero-bg");
    expect(page.definitions["hero-bg"]).toEqual({
      type: "backgroundVariable",
      layers: [{ fill: "#111111" }],
    });
    expect(section.fill).toBeUndefined();
  });

  it("promotes and drops section when it is background-only", () => {
    const page = {
      slug: "case-study",
      sectionOrder: [],
      definitions: {},
    };
    const section = {
      type: "contentBlock",
      bgImage: "hero/bg.png",
      elements: [],
    } as Record<string, unknown>;
    const ctx = makeCtx();

    const result = promotePageBackgroundFromSection({
      page,
      section,
      sectionId: "hero",
      frameName: "Page/Case Study",
      ctx,
    });

    expect(result).toEqual({ promoted: true, dropSection: true });
    expect(page.bgKey).toBe("hero-bg");
    expect(page.definitions["hero-bg"]).toEqual({
      type: "backgroundImage",
      image: "hero/bg.png",
    });
  });

  it("does not promote when page already has a bgKey", () => {
    const page = {
      slug: "case-study",
      sectionOrder: [],
      definitions: {},
      bgKey: "existing-bg",
    };
    const section = {
      type: "contentBlock",
      fill: "#111111",
      elements: [{ type: "elementHeading", text: "Hello" }],
    } as Record<string, unknown>;
    const ctx = makeCtx();

    const result = promotePageBackgroundFromSection({
      page,
      section,
      sectionId: "hero",
      frameName: "Page/Case Study",
      ctx,
    });

    expect(result).toEqual({ promoted: false, dropSection: false });
    expect(page.definitions).toEqual({});
    expect(section.fill).toBe("#111111");
  });
});
