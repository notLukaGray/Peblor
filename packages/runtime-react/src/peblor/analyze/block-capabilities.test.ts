import { describe, expect, it } from "vitest";
import type { ElementBlock, SectionBlock } from "@pb/contracts/types";
import { analyzeBlockCapabilities } from "./block-capabilities";

function section(overrides: Partial<SectionBlock> = {}): SectionBlock {
  return {
    type: "contentBlock",
    elements: [],
    ...overrides,
  } as SectionBlock;
}

function heading(overrides: Partial<ElementBlock> = {}): ElementBlock {
  return {
    type: "elementHeading",
    text: "Hello",
    ...overrides,
  } as ElementBlock;
}

describe("analyzeBlockCapabilities", () => {
  it("classifies simple text sections as static", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [section({ elements: [heading()] })],
    });

    expect(result.classification).toBe("static");
    expect(result.tree.children[0]?.classification).toBe("static");
    expect(result.tree.children[0]?.children[0]?.classification).toBe("static");
  });

  it("forces descendants under client sections to client", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [section({ motion: { animate: { opacity: 1 } }, elements: [heading()] })],
    });

    const sectionNode = result.tree.children[0];
    expect(sectionNode?.classification).toBe("client");
    expect(sectionNode?.children[0]?.classification).toBe("client");
    expect(sectionNode?.children[0]?.reasons).toContain("ancestor-client");
  });

  it("marks static wrappers with client children as mixed", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [heading(), { type: "elementVideo", src: "/video.mp4" } as ElementBlock],
        }),
      ],
    });

    const sectionNode = result.tree.children[0];
    expect(result.classification).toBe("mixed");
    expect(sectionNode?.classification).toBe("mixed");
    expect(sectionNode?.children.map((child) => child.classification)).toEqual([
      "static",
      "client",
    ]);
  });

  it("treats visibleWhen as client because it reads the variable store", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            heading({
              visibleWhen: { variable: "user.name", operator: "equals", value: "Jane" },
            }),
          ],
        }),
      ],
    });

    const elementNode = result.tree.children[0]?.children[0];
    expect(elementNode?.classification).toBe("client");
    expect(elementNode?.reasons).toContain("client-prop");
    expect(elementNode?.reasons).toContain("store-read");
  });

  it("treats variableKey and string templates as store reads", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            heading({ variableKey: "user.name" }),
            heading({ text: "Welcome {user.name}" }),
          ],
        }),
      ],
    });

    const elementNodes = result.tree.children[0]?.children ?? [];
    expect(elementNodes.map((node) => node.classification)).toEqual(["client", "client"]);
    expect(elementNodes.every((node) => node.reasons.includes("store-read"))).toBe(true);
  });

  it("treats elementMarquee as client (infinite ticker needs ElementMarquee, not server stub)", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: null,
      resolvedSections: [
        section({
          elements: [
            { type: "elementMarquee", text: "Tick", direction: "left", speed: 20 } as ElementBlock,
          ],
        }),
      ],
    });

    const elementNode = result.tree.children[0]?.children[0];
    expect(elementNode?.classification).toBe("client");
    expect(elementNode?.reasons).toContain("client-only-type");
  });

  it("marks page scroll and background transitions as page runtime", () => {
    const result = analyzeBlockCapabilities({
      resolvedBg: { type: "image", src: "/bg.jpg" } as never,
      resolvedSections: [section()],
      scroll: { mode: "page" } as never,
      transitions: [{ id: "fade", from: "a", to: "b", effect: "fade" }] as never,
    });

    expect(result.classification).toBe("client");
    expect(result.usesPageRuntime).toBe(true);
    expect(result.tree.reasons).toContain("page-runtime");
  });
});
